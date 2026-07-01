from fastapi import APIRouter, Depends, Response, Request
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.audit import audit
from app.core.security import get_current_user, clear_auth_cookies
from app.core.crypto import decrypt_text
from app.integrations.plaid_client import plaid_client
from app.models.user import User
from app.models.bank_account import BankAccount
from app.models.transaction import Transaction
from app.models.linked_account import LinkedAccount
from app.models.net_worth_snapshot import NetWorthSnapshot

from plaid.model.item_remove_request import ItemRemoveRequest

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me")
def read_current_user(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "created_at": current_user.created_at,
        "is_premium": current_user.is_premium,
    }


@router.get("/me/export")
def export_my_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export all of the user's data as JSON (data portability / access right).
    Secrets (encrypted Plaid access tokens) are intentionally excluded.
    """
    accounts = db.query(BankAccount).filter(BankAccount.user_id == current_user.id).all()
    acct_ids = [a.id for a in accounts]
    txs = (
        db.query(Transaction).filter(Transaction.account_id.in_(acct_ids)).all()
        if acct_ids else []
    )
    linked = db.query(LinkedAccount).filter(LinkedAccount.user_id == current_user.id).all()
    snaps = db.query(NetWorthSnapshot).filter(NetWorthSnapshot.user_id == current_user.id).all()

    return {
        "profile": {
            "id": str(current_user.id),
            "email": current_user.email,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "date_of_birth": current_user.date_of_birth.isoformat() if current_user.date_of_birth else None,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
            "is_premium": current_user.is_premium,
        },
        "linked_institutions": [
            {
                "item_id": l.item_id,
                "institution_name": l.institution_name,
                "last_synced_at": l.last_synced_at.isoformat() if l.last_synced_at else None,
                "connected_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in linked
        ],
        "accounts": [
            {
                "id": str(a.id),
                "name": a.name,
                "institution": a.institution,
                "account_type": a.account_type,
                "balance": str(a.balance),
            }
            for a in accounts
        ],
        "transactions": [
            {
                "id": str(t.id),
                "account_id": str(t.account_id),
                "date": str(t.date) if t.date else None,
                "amount": str(t.amount),
                "description": t.description,
                "merchant_name": t.merchant_name,
                "category": t.category,
                "pending": t.pending,
            }
            for t in txs
        ],
        "net_worth_history": [
            {
                "date": s.captured_on.isoformat(),
                "net_worth": str(s.net_worth),
                "total_assets": str(s.total_assets),
                "total_liabilities": str(s.total_liabilities),
            }
            for s in snaps
        ],
    }


@router.delete("/me")
def delete_my_account(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete the user and ALL of their data (right to erasure).
    Best-effort removes Plaid items first so Plaid stops accessing/billing,
    then deletes every owned record and clears the session.
    """
    uid = current_user.id

    for item in db.query(LinkedAccount).filter(LinkedAccount.user_id == uid).all():
        try:
            plaid_client.item_remove(
                ItemRemoveRequest(access_token=decrypt_text(item.access_token))
            )
        except Exception:
            pass  # delete local data regardless

    acct_ids = [a.id for a in db.query(BankAccount).filter(BankAccount.user_id == uid).all()]
    if acct_ids:
        db.query(Transaction).filter(
            Transaction.account_id.in_(acct_ids)
        ).delete(synchronize_session=False)
    db.query(BankAccount).filter(BankAccount.user_id == uid).delete(synchronize_session=False)
    db.query(NetWorthSnapshot).filter(NetWorthSnapshot.user_id == uid).delete(synchronize_session=False)
    db.query(LinkedAccount).filter(LinkedAccount.user_id == uid).delete(synchronize_session=False)
    from app.models.refresh_token import RefreshToken
    db.query(RefreshToken).filter(RefreshToken.user_id == uid).delete(synchronize_session=False)
    db.query(User).filter(User.id == uid).delete(synchronize_session=False)
    db.commit()

    audit("account_deleted", request=request, user_id=uid)
    clear_auth_cookies(response)
    return {"status": "account_deleted"}
