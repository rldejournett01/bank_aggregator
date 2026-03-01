from pydantic import BaseModel
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timezone

class TransactionCreate(BaseModel):
    amount: Decimal
    description: str

class TransactionOut(BaseModel):
    id: UUID
    amount: Decimal
    description: str
    created_at: datetime

    class Config:
        from_attributes = True