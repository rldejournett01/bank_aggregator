from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.bank_account import BankAccount
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/")
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dashboard summary endpoint.

    Returns:
    - total_balance: sum of all account balances for the current user
    - accounts: JSON-safe list of account objects (includes string UUID `id`)
    """

    # 1) Fetch accounts owned by the current user
    accounts = (
        db.query(BankAccount)
        .filter(BankAccount.user_id == current_user.id)
        .all()
    )

    # 2) Compute total balance safely (coalesce handles NULL -> 0)
    total_balance = (
        db.query(func.coalesce(func.sum(BankAccount.balance), 0))
        .filter(BankAccount.user_id == current_user.id)
        .scalar()
    )

    # 3) Return JSON-safe data (never return raw ORM objects to the client)
    #    - Convert UUIDs to strings
    #    - Convert Decimals/Numerics to strings (safe for JSON + UI formatting)
    return {
        "total_balance": str(total_balance),
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
    }