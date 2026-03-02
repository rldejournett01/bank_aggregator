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

            # -------------------------------------------------
            # Insert transactions (idempotent)
            # -------------------------------------------------
            for pt in plaid_transactions:
                # Stable Plaid transaction id (used for idempotency)
                plaid_tx_id = pt["transaction_id"]

                # Human-readable transaction name
                name = pt.get("name") or "Transaction"

                # Plaid amount is usually positive for outflow
                # We store outflows as negative values for consistency
                raw_amount = Decimal(str(pt.get("amount", 0)))
                signed_amount = -abs(raw_amount)

                # Determine transaction type
                # Plaid may provide "transaction_type" or "payment_channel"
                # Fallback ensures DB NOT NULL constraint is always satisfied
                tx_type = (
                    pt.get("transaction_type")
                    or pt.get("payment_channel")
                    or "unknown"
                )

                # Skip if transaction already exists (idempotent sync)
                exists = db.query(Transaction).filter(
                    Transaction.external_id == plaid_tx_id
                ).first()
                if exists:
                    continue

                # TEMP mapping: attach transaction to an account by institution
                # ⚠️ Next increment: map using plaid_account_id for correctness
                account = db.query(BankAccount).filter(
                    BankAccount.user_id == current_user.id,
                    BankAccount.institution == (item.institution_name or "Unknown Institution")
                ).first()

                # If no matching account exists, skip to avoid orphaned transactions
                if not account:
                    continue

                # Create transaction record
                new_tx = Transaction(
                    account_id=account.id,
                    external_id=plaid_tx_id,
                    amount=signed_amount,
                    description=name,
                    transaction_type=tx_type,  # Never None
                )

                # Stage insert
                db.add(new_tx)

        db.commit()
        return {"status": "synced", "linked_items": len(linked_items)}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")