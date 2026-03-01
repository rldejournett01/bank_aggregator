from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal

from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.country_code import CountryCode

from app.core.deps import get_db
from app.core.security import get_current_user
from app.core.crypto import decrypt_text
from app.integrations.plaid_client import plaid_client

from app.models.user import User
from app.models.linked_account import LinkedAccount
from app.models.bank_account import BankAccount
from app.models.transaction import Transaction

router = APIRouter(prefix="/plaid", tags=["Plaid Sync"])



@router.post("/sync")
def sync_plaid(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    linked_items = db.query(LinkedAccount).filter(
        LinkedAccount.user_id == current_user.id
    ).all()

    if not linked_items:
        raise HTTPException(status_code=400, detail="No linked accounts found")

    try:
        # For now, pull last 30 days of transactions
        # (Later we’ll use Plaid transactions/sync endpoint for incremental sync)
        import datetime
        end_date = datetime.date.today()
        start_date = end_date - datetime.timedelta(days=30)

        for item in linked_items:
            access_token = decrypt_text(item.access_token)

            # 1) Get accounts from Plaid
            accounts_req = AccountsGetRequest(access_token=access_token)
            accounts_resp = plaid_client.accounts_get(accounts_req).to_dict()
            plaid_accounts = accounts_resp["accounts"]

            # Upsert each account into our DB
            for pa in plaid_accounts:
                plaid_account_id = pa["account_id"]  # stable Plaid id
                name = pa.get("name") or "Account"
                subtype = pa.get("subtype") or pa.get("type") or "unknown"
                institution_name = item.institution_name or "Unknown Institution"

                current_balance = pa.get("balances", {}).get("current")
                if current_balance is None:
                    current_balance = 0

                # Find existing account (we'll use name+item for now).
                # Later we should store plaid_account_id on the bank_accounts table.
                account = db.query(BankAccount).filter(
                    BankAccount.user_id == current_user.id,
                    BankAccount.name == name,
                    BankAccount.institution == institution_name
                ).first()

                if not account:
                    account = BankAccount(
                        user_id=current_user.id,
                        name=name,
                        institution=institution_name,
                        account_type=subtype,
                        balance=Decimal(str(current_balance)),
                    )
                    db.add(account)
                    db.flush()
                else:
                    # For aggregator, balance comes from Plaid, so overwrite safely
                    account.balance = Decimal(str(current_balance))

            # 2) Get transactions from Plaid
            tx_req = TransactionsGetRequest(
                access_token=access_token,
                start_date=start_date,
                end_date=end_date,
            )
            tx_resp = plaid_client.transactions_get(tx_req).to_dict()
            plaid_transactions = tx_resp.get("transactions", [])

            # Insert transactions idempotently
            for pt in plaid_transactions:
                plaid_tx_id = pt["transaction_id"]
                name = pt.get("name") or "Transaction"
                amount = Decimal(str(pt.get("amount", 0)))

                # Plaid amount is usually positive for outflow; many apps store outflow as negative.
                # We'll store: outflow = -amount, inflow = +amount (more intuitive for balances)
                # Plaid provides "transaction_type"/"payment_channel" but simplest:
                signed_amount = -amount

                # Check if tx already exists
                exists = db.query(Transaction).filter(
                    Transaction.external_id == plaid_tx_id
                ).first()
                if exists:
                    continue

                # Attach to an account: Plaid tx has account_id, map by name/institution for now
                # Later: store plaid_account_id in BankAccount to map perfectly.
                account_id = pt.get("account_id")

                # naive mapping: pick first account with same institution (upgrade later)
                account = db.query(BankAccount).filter(
                    BankAccount.user_id == current_user.id,
                    BankAccount.institution == (item.institution_name or "Unknown Institution")
                ).first()

                if not account:
                    continue  # avoid inserting orphan tx

                new_tx = Transaction(
                    account_id=account.id,
                    external_id=plaid_tx_id,
                    amount=signed_amount,
                    description=name,
                )
                db.add(new_tx)

        db.commit()
        return {"status": "synced", "linked_items": len(linked_items)}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")