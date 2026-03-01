import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.core.database import Base

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)
    institution = Column(String, nullable=False)
    account_type = Column(String, nullable=False)
    balance = Column(Numeric(12, 2), default=0)

    from datetime import datetime, timezone

created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))