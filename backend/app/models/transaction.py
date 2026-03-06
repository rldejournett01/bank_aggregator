import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Boolean, Date
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Which account this transaction belongs to
    account_id = Column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=False)

    # Financial data
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=False)
    transaction_type = Column(String, nullable=False, default="unknown")

    # NEW FIELDS FOR FILTERING + ANALYTICS
    date = Column(Date, nullable=True)  # transaction posting date
    category = Column(String, nullable=True)
    merchant_name = Column(String, nullable=True)
    pending = Column(Boolean, default=False)

    # Idempotency protection
    external_id = Column(String, unique=True, index=True, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))