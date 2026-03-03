from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID

from app.core.deps import get_db
from app.core.security import get_current_user

from app.models.bank_account import BankAccount
from app.models.transaction import Transaction
from app.schemas.bank_account import BankAccountCreate, BankAccountOut
from app.models.user import User

router = APIRouter(prefix="/accounts", tags=["Bank Accounts"])


# -------------------------------------------------
# Create a bank account (manual/internal)
# NOTE: Plaid-created accounts are inserted/updated by /plaid/sync.
# -------------------------------------------------
@router.post("/", response_model=BankAccountOut)
def create_account(
    account: BankAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create a new account owned by the current user
    new_account = BankAccount(
        user_id = current_user.id,
        **account.model_dump() #BaseModel.dict() is deprecate in Pydantic v2 
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account


# -------------------------------------------------
# List accounts owned by the current user
# -------------------------------------------------
@router.get("/", response_model=list[BankAccountOut])
def get_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(BankAccount)
        .filter(BankAccount.user_id == current_user.id)
        .order_by(desc(BankAccount.created_at))
        .all()
    )


# -------------------------------------------------
# Get a single account (must belong to the current user)
# -------------------------------------------------
@router.get("/{account_id}", response_model=BankAccountOut)
def get_account(
    account_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Security rule:
    - Users can only access accounts they own.
    """
    account = (
        db.query(BankAccount)
        .filter(BankAccount.id == account_id, BankAccount.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return account


# -------------------------------------------------
# List transactions for a specific account (user-scoped)
# -------------------------------------------------
@router.get("/{account_id}/transactions")
def get_account_transactions(
    account_id: UUID,
    limit: int = 50,
    offset: int = 0,

    # 🔹 NEW FILTER PARAMETERS
    start_date: str | None = None,
    end_date: str | None = None,
    search: str | None = None,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns transactions for ONE account.

    Pagination:
    - limit: how many results to return
    - offset: how many results to skip
    - start/end dates: support data filtering
    - search for text search
    """

    # 1) Ensure the account belongs to the user (prevents data leaks)
    account = (
        db.query(BankAccount)
        .filter(BankAccount.id == account_id, BankAccount.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # 2) Build base query for this account
    query = db.query(Transaction).filter(
        Transaction.account_id == account.id
    )

    # 🔹 Apply date filtering if provided
    if start_date:
        query = query.filter(Transaction.date >= start_date)

    if end_date:
        query = query.filter(Transaction.date <= end_date)

    # 🔹 Apply text search (description)
    if search:
        query = query.filter(
            Transaction.description.ilike(f"%{search}%")
        )

    # 🔹 Apply ordering + pagination
    txs = (
        query.order_by(desc(Transaction.date))
        .offset(offset)
        .limit(min(limit, 200))  # guardrail limit
        .all()
    )

    # 3) Return a stable JSON structure (easy for frontend)
    return {
        "account": {
            "id": str(account.id),
            "name": account.name,
            "institution": account.institution,
            "account_type": account.account_type,
            "balance": str(account.balance),
        },
        "transactions": [
            {
                "id": str(t.id),
                "amount": str(t.amount),
                "description": t.description,
                "transaction_type": t.transaction_type,
                "external_id": t.external_id,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in txs
        ],
        "pagination": {"limit": limit, "offset": offset, "returned": len(txs)},
    }
    

# -------------------------------------------------
# Category Spending Summary (per account)
# -------------------------------------------------
from sqlalchemy import func


@router.get("/{account_id}/category-summary")
def get_category_summary(
    account_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns total transaction amounts grouped by category
    for a specific account.

    Used for analytics / spending breakdown.
    """

    # 1) Ensure account belongs to user
    account = (
        db.query(BankAccount)
        .filter(
            BankAccount.id == account_id,
            BankAccount.user_id == current_user.id
        )
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # 2) Group transactions by category
    rows = (
        db.query(
            Transaction.category,
            func.sum(Transaction.amount).label("total")
        )
        .filter(Transaction.account_id == account.id)
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount))  # most negative (largest spend) first
        .all()
    )

    # 3) Return clean JSON
    return [
        {
            "category": r[0] or "Uncategorized",
            "total": str(r[1])
        }
        for r in rows
    ]