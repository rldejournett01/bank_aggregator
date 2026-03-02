import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # FK: owner of this account
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Plaid stable account id (transactions reference this)
    plaid_account_id = Column(String, unique=True, index=True, nullable=True)

    # Display fields
    name = Column(String, nullable=False)
    institution = Column(String, nullable=False)
    account_type = Column(String, nullable=False)

    # Balance is overwritten from Plaid during sync
    balance = Column(Numeric(12, 2), default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))