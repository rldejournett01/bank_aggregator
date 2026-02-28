from pydantic import BaseModel
from uuid import UUID
from decimal import Decimal

class BankAccountCreate(BaseModel):
    name: str
    institution: str
    account_type: str
    balance: Decimal


class BankAccountOut(BaseModel):
    id: UUID
    name: str
    institution: str
    account_type: str
    balance: Decimal

    class Config:
        from_attributes = True