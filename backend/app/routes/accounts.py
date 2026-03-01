from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.core.security import get_current_user
from app.models.bank_account import BankAccount
from app.schemas.bank_account import BankAccountCreate, BankAccountOut
from app.models.user import User

router = APIRouter(prefix="/accounts", tags=["Bank Accounts"])

@router.post("/", response_model=BankAccountOut)
def create_account(
    account: BankAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_account = BankAccount(
        user_id = current_user.id,
        **account.model_dump() #BaseModel.dict() is deprecated 
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return new_account

@router.get("/", response_model=list[BankAccountOut])
def get_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(BankAccount).filter(
        BankAccount.user_id == current_user.id).all()
    