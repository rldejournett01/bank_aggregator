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
    current_user: User = Depends(get_current_user)
):
    accounts = db.query(BankAccount).filter(
        BankAccount.user_id == current_user.id).all()
    
    total_balance = db.query(
        func.coalesce(func.sum(BankAccount.balance), 0)).filter(
            BankAccount.user_id == current_user.id
        ).scalar()
    
    return {
        "total_balance": float(total_balance),
        "accounts": accounts
    }

                
    