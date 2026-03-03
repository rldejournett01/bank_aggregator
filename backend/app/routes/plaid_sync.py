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

            # Insert transactions idempotently
            for pt in plaid_transactions:

                plaid_tx_id = pt["transaction_id"]
                name = pt.get("name") or "Transaction"
                amount = Decimal(str(pt.get("amount", 0)))

                # Plaid amounts:
                # Positive = money leaving account
                # We store outflow as negative for consistency
                signed_amount = -amount

                # Determine transaction type
                tx_type = "debit" if signed_amount < 0 else "credit"

                # 🔹 NEW FIELDS EXTRACTION

                # Date comes as ISO string (YYYY-MM-DD)
                tx_date = pt.get("date")  # keep as string; SQLAlchemy Date handles it

                # Merchant name (may be None)
                merchant_name = pt.get("merchant_name")

                # Category list example: ["Food and Drink", "Restaurants"]
                category_list = pt.get("category") or []
                category = category_list[0] if category_list else "Uncategorized"

                # Pending status
                pending = pt.get("pending", False)

                # Idempotency check
                exists = db.query(Transaction).filter(
                    Transaction.external_id == plaid_tx_id
                ).first()

                if exists:
                    continue

                # 🔹 UPDATED INSERT
                new_tx = Transaction(
                    account_id=account.id,
                    external_id=plaid_tx_id,
                    amount=signed_amount,
                    description=name,
                    transaction_type=tx_type,
                    date=tx_date,
                    merchant_name=merchant_name,
                    category=category,
                    pending=pending,
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