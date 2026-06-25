import uuid 
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class LinkedAccount(Base):
    __tablename__ = "linked_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    #Plaid identifiers
    item_id = Column(String, unique=True, index=True, nullable=False)
    access_token = Column(String, nullable=False) #encrpyted during plaid exchange

    #Institution metadata (helps UI + debugging)
    institution_id = Column(String, index=True, nullable=True)
    institution_name = Column(String, nullable=True)

    # Plaid /transactions/sync incremental cursor (null until first sync).
    # Persisting this lets us pull only the delta on each sync instead of
    # re-fetching a fixed date window every time.
    plaid_cursor = Column(String, nullable=True)

    # When this item last completed a successful sync (shown in the UI).
    last_synced_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))