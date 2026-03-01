import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=False)

    amount = Column(Numeric(12,2), nullable=False)
    description = Column(String, nullable=False)
    transaction_type = Column(String, nullable=False)

    external_id = Column(String, unique=True, index=True, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
