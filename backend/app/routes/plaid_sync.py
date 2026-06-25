from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime, timezone

from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest

from app.core.deps import get_db
from app.core.security import get_current_user
from app.core.crypto import decrypt_text
from app.core.snapshots import record_net_worth_snapshot
from app.integrations.plaid_client import plaid_client

from app.models.user import User
from app.models.linked_account import LinkedAccount
from app.models.bank_account import BankAccount
from app.models.transaction import Transaction

router = APIRouter(prefix="/plaid", tags=["Plaid Sync"])


PLAID_GENERIC_PREFIXES = ("plaid ", "plaid_")


def _display_name(raw_name: str, institution_name: str, subtype: str, mask: str | None) -> str:
    """Build a readable account name; Plaid sandbox returns generic names."""
    is_generic = any(raw_name.lower().startswith(p) for p in PLAID_GENERIC_PREFIXES)
    if is_generic or not raw_name:
        base_name = f"{institution_name} {subtype.replace('_', ' ').title()}"
    else:
        base_name = raw_name
    return f"{base_name} ••{mask}" if mask else base_name


def _extract_category(pt: dict) -> str:
    """Prefer Plaid's modern personal_finance_category; fall back to legacy list."""
    pfc = pt.get("personal_finance_category")
    if pfc and isinstance(pfc, dict) and pfc.get("primary"):
        return pfc["primary"]
    category_list = pt.get("category") or []
    return category_list[0] if category_list else "Uncategorized"


def _apply_plaid_tx(tx: Transaction, pt: dict, account_id) -> None:
    """Populate/refresh a Transaction row from a Plaid transaction dict.

    Plaid amounts are positive for outflow; we store outflow as negative so a
    balance is simply the sum of its transaction amounts.
    """
    signed_amount = -Decimal(str(pt.get("amount", 0)))
    tx.account_id = account_id
    tx.external_id = pt["transaction_id"]
    tx.amount = signed_amount
    tx.description = pt.get("name") or "Transaction"
    tx.transaction_type = "debit" if signed_amount < 0 else "credit"
    tx.date = pt.get("date")  # ISO string; SQLAlchemy Date handles it
    tx.merchant_name = pt.get("merchant_name")
    tx.category = _extract_category(pt)
    tx.pending = pt.get("pending", False)


def _sync_single_item(db: Session, user_id, item: LinkedAccount) -> dict:
    """
    Sync one linked Plaid item (institution): upsert its accounts, then pull the
    incremental transaction delta. Raises on failure; the caller commits.

    Each transaction is mapped to its OWN account via pt["account_id"] (the bug
    fix), and transactions come from Plaid's cursor-based /transactions/sync so
    we ingest full history on first sync and only the delta afterwards.
    """
    counts = {
        "accounts_created": 0,
        "accounts_updated": 0,
        "transactions_added": 0,
        "transactions_modified": 0,
        "transactions_removed": 0,
        "skipped_orphans": 0,
    }

    access_token = decrypt_text(item.access_token)

    # 1) Accounts: upsert by plaid_account_id, then build a lookup map so each
    #    transaction can resolve to the correct account.
    accounts_resp = plaid_client.accounts_get(
        AccountsGetRequest(access_token=access_token)
    ).to_dict()

    account_map: dict[str, object] = {}  # plaid_account_id -> BankAccount.id

    for pa in accounts_resp.get("accounts", []):
        plaid_account_id = pa["account_id"]
        subtype = pa.get("subtype") or pa.get("type") or "unknown"
        institution_name = item.institution_name or "Linked Institution"
        name = _display_name(pa.get("name") or "", institution_name, subtype, pa.get("mask"))
        current_balance = pa.get("balances", {}).get("current")
        if current_balance is None:
            current_balance = 0

        account = db.query(BankAccount).filter(
            BankAccount.user_id == user_id,
            BankAccount.plaid_account_id == plaid_account_id,
        ).first()

        if not account:
            account = BankAccount(
                user_id=user_id,
                plaid_account_id=plaid_account_id,
                name=name,
                institution=institution_name,
                account_type=subtype,
                balance=Decimal(str(current_balance)),
            )
            db.add(account)
            db.flush()  # assign account.id for the lookup map
            counts["accounts_created"] += 1
        else:
            account.name = name
            account.institution = institution_name
            account.account_type = subtype
            account.balance = Decimal(str(current_balance))
            counts["accounts_updated"] += 1

        account_map[plaid_account_id] = account.id

    # 2) Transactions: incremental cursor sync (added/modified/removed)
    cursor = item.plaid_cursor
    added: list[dict] = []
    modified: list[dict] = []
    removed: list[dict] = []

    while True:
        if cursor:
            request = TransactionsSyncRequest(access_token=access_token, cursor=cursor)
        else:
            request = TransactionsSyncRequest(access_token=access_token)

        resp = plaid_client.transactions_sync(request).to_dict()
        added.extend(resp.get("added", []))
        modified.extend(resp.get("modified", []))
        removed.extend(resp.get("removed", []))
        cursor = resp.get("next_cursor")
        if not resp.get("has_more"):
            break

    # added: insert (idempotent on external_id)
    for pt in added:
        account_id = account_map.get(pt.get("account_id"))
        if account_id is None:
            counts["skipped_orphans"] += 1
            continue
        if db.query(Transaction).filter(Transaction.external_id == pt["transaction_id"]).first():
            continue
        new_tx = Transaction()
        _apply_plaid_tx(new_tx, pt, account_id)
        db.add(new_tx)
        counts["transactions_added"] += 1

    # modified: update existing rows (insert if missing)
    for pt in modified:
        account_id = account_map.get(pt.get("account_id"))
        if account_id is None:
            counts["skipped_orphans"] += 1
            continue
        existing = db.query(Transaction).filter(
            Transaction.external_id == pt["transaction_id"]
        ).first()
        if existing:
            _apply_plaid_tx(existing, pt, account_id)
            counts["transactions_modified"] += 1
        else:
            new_tx = Transaction()
            _apply_plaid_tx(new_tx, pt, account_id)
            db.add(new_tx)
            counts["transactions_added"] += 1

    # removed: delete by external_id
    for r in removed:
        deleted = db.query(Transaction).filter(
            Transaction.external_id == r["transaction_id"]
        ).delete(synchronize_session=False)
        counts["transactions_removed"] += deleted

    item.plaid_cursor = cursor
    item.last_synced_at = datetime.now(timezone.utc)
    return counts


@router.post("/sync")
def sync_plaid(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync all of the current user's linked Plaid items."""
    linked_items = db.query(LinkedAccount).filter(
        LinkedAccount.user_id == current_user.id
    ).all()

    if not linked_items:
        raise HTTPException(status_code=400, detail="No linked accounts found")

    totals = {
        "accounts_created": 0,
        "accounts_updated": 0,
        "transactions_added": 0,
        "transactions_modified": 0,
        "transactions_removed": 0,
        "skipped_orphans": 0,
    }
    item_errors: list[dict] = []

    for item in linked_items:
        try:
            counts = _sync_single_item(db, current_user.id, item)
            db.commit()
            for k, v in counts.items():
                totals[k] += v
        except Exception as e:  # isolate per-item failures
            db.rollback()
            item_errors.append({"item_id": item.item_id, "error": str(e)})

    # Record today's net-worth snapshot from the freshly-synced balances.
    record_net_worth_snapshot(db, current_user.id)
    db.commit()

    return {
        "status": "synced" if not item_errors else "partial",
        "linked_items": len(linked_items),
        **totals,
        "errors": item_errors,
    }


@router.post("/webhook")
async def plaid_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Plaid-called endpoint (no user auth). On a TRANSACTIONS update, sync just
    the affected item so balances/transactions refresh without the user
    pressing "Sync".

    NOTE: production must verify the Plaid webhook JWT (via
    /webhook_verification_key/get) before acting. We only ever act on item_ids
    that already exist for a user, so an unverified call can at most trigger an
    idempotent re-sync of known items.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    webhook_type = payload.get("webhook_type")
    item_id = payload.get("item_id")
    if webhook_type != "TRANSACTIONS" or not item_id:
        return {"status": "ignored"}

    item = db.query(LinkedAccount).filter(LinkedAccount.item_id == item_id).first()
    if not item:
        return {"status": "unknown_item"}

    try:
        _sync_single_item(db, item.user_id, item)
        db.commit()
        record_net_worth_snapshot(db, item.user_id)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Webhook sync failed: {str(e)}")

    return {"status": "synced", "item_id": item_id}
