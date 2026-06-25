import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class RefreshToken(Base):
    """
    One row per issued refresh token (identified by its JWT `jti`).

    Enables refresh-token rotation with reuse detection: on each refresh we
    revoke the presented token and issue a new one. If a token that has
    already been revoked is presented again, that signals theft/replay and we
    revoke every token for the user.
    """
    __tablename__ = "refresh_tokens"

    # jti claim from the refresh JWT
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    revoked = Column(Boolean, nullable=False, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
