import uuid
from sqlalchemy import Column, String, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.core.database import Base
from sqlalchemy import Boolean

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    is_premium = Column(Boolean, default=False)

    # Identity fields collected at signup. Nullable at the DB level so
    # pre-existing rows aren't broken by this migration; UserCreate requires
    # them for all new signups going forward.
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)

    # Stripe billing linkage
    stripe_customer_id = Column(String, index=True, nullable=True)
    stripe_subscription_id = Column(String, index=True, nullable=True)


    