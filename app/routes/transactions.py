from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.bank_account import BankAccount
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionOut
from app.models.user import User

router = APIRouter(prefix="/transactions", tags=["Transactions"])

#create transcations credit or debit
@router.post("/{account_id}", response_model=TransactionOut)
def create_transaction(
    account_id: str,
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    account = db.query(BankAccount).filter(
        BankAccount.id == account_id,
        BankAccount.user_id == current_user.id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    new_tx = Transaction(
        account_id = account.id,
        amount = transaction.amount,
        description = transaction.description
    )

    account.balance += transaction.amount

    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)

    return new_tx

#get transaction credit or debit
@router.get("/{account_id}", response_model=list[TransactionOut])
def get_transactions(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    account = db.query(BankAccount).filter(
        BankAccount.id == account_id,
        BankAccount.user_id == current_user.id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return db.query(Transaction).filter(
        Transaction.account_id == account.id
    ).order_by(Transaction.created_at.desc()).all()