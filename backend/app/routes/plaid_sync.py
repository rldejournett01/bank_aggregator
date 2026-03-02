from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
import datetime

from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.transactions_get_request import TransactionsGetRequest

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
    """
    Sync bank accounts + transactions from Plaid for the current user.

    Increment 10 improvements:
    - Upsert BankAccount using plaid_account_id (stable identifier)
    - Map each transaction to the correct BankAccount via pt["account_id"]
    """

    # Pull all linked Plaid items for this user (each item = one institution connection)
    linked_items = db.query(LinkedAccount).filter(
        LinkedAccount.user_id == current_user.id
    ).all()

    if not linked_items:
        raise HTTPException(status_code=400, detail="No linked accounts found")

    try:
        # Pull last 30 days for now (later: transactions/sync incremental endpoint)
        end_date = datetime.date.today()
        start_date = end_date - datetime.timedelta(days=30)

        created_accounts = 0
        updated_accounts = 0
        created_txs = 0

        for item in linked_items:
            # Decrypt Plaid access token just-in-time (never store plaintext)
            access_token = decrypt_text(item.access_token)

            # -------------------------------------------------
            # 1) Accounts: upsert by plaid_account_id
            # -------------------------------------------------
            accounts_req = AccountsGetRequest(access_token=access_token)
            accounts_resp = plaid_client.accounts_get(accounts_req).to_dict()
            plaid_accounts = accounts_resp.get("accounts", [])

            for pa in plaid_accounts:
                # Plaid's stable account id (this is what transactions reference)
                plaid_account_id = pa["account_id"]

                name = pa.get("name") or "Account"
                subtype = pa.get("subtype") or pa.get("type") or "unknown"

                institution_name = item.institution_name or "Linked Institution"

                # Plaid balance object may omit current
                current_balance = pa.get("balances", {}).get("current")
                if current_balance is None:
                    current_balance = 0

                # Find account by plaid_account_id (the correct durable key)
                account = db.query(BankAccount).filter(
                    BankAccount.user_id == current_user.id,
                    BankAccount.plaid_account_id == plaid_account_id
                ).first()

                if not account:
                    # Create new local bank account record
                    account = BankAccount(
                        user_id=current_user.id,
                        plaid_account_id=plaid_account_id,
                        name=name,
                        institution=institution_name,
                        account_type=subtype,
                        balance=Decimal(str(current_balance)),
                    )
                    db.add(account)
                    created_accounts += 1
                    db.flush()  # ensures account.id exists immediately for related inserts
                else:
                    # Update balance + metadata in place
                    account.name = name
                    account.institution = institution_name
                    account.account_type = subtype
                    account.balance = Decimal(str(current_balance))
                    updated_accounts += 1

            # -------------------------------------------------
            # 2) Transactions: map to account via pt["account_id"]
            # -------------------------------------------------
            tx_req = TransactionsGetRequest(
                access_token=access_token,
                start_date=start_date,
                end_date=end_date,
            )
            tx_resp = plaid_client.transactions_get(tx_req).to_dict()
            plaid_transactions = tx_resp.get("transactions", [])

            for pt in plaid_transactions:
                plaid_tx_id = pt["transaction_id"]
                description = pt.get("name") or "Transaction"

                # Plaid usually returns positive values for outflows.
                # We store outflows as negative for consistency.
                raw_amount = Decimal(str(pt.get("amount", 0)))
                amount = -abs(raw_amount)

                # Never allow None into a NOT NULL column
                tx_type = pt.get("transaction_type") or pt.get("payment_channel") or "unknown"

                # Idempotency: skip if already stored
                exists = db.query(Transaction).filter(
                    Transaction.external_id == plaid_tx_id
                ).first()
                if exists:
                    continue

                # ✅ Correct mapping: Plaid transaction references a Plaid account_id
                plaid_account_id = pt.get("account_id")
                if not plaid_account_id:
                    continue

                # Find the correct local BankAccount using plaid_account_id
                account = db.query(BankAccount).filter(
                    BankAccount.user_id == current_user.id,
                    BankAccount.plaid_account_id == plaid_account_id
                ).first()

                # If account doesn't exist locally, skip to avoid orphaned transactions
                # (This should be rare because we sync accounts first.)
                if not account:
                    continue

                new_tx = Transaction(
                    account_id=account.id,
                    external_id=plaid_tx_id,
                    amount=amount,
                    description=description,
                    transaction_type=tx_type,
                )
                db.add(new_tx)
                created_txs += 1

        db.commit()

        return {
            "status": "synced",
            "linked_items": len(linked_items),
            "accounts_created": created_accounts,
            "accounts_updated": updated_accounts,
            "transactions_created": created_txs,
            "range_days": 30,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")