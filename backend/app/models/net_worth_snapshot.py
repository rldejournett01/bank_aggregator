import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Numeric, Date, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class NetWorthSnapshot(Base):
    """
    One row per user per day, capturing net worth and its asset/liability split.
    Powers the net-worth-over-time chart. Upserted on each sync so the latest
    figure for a given day wins.
    """
    __tablename__ = "net_worth_snapshots"
    __table_args__ = (
        UniqueConstraint("user_id", "captured_on", name="uq_networth_user_day"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    captured_on = Column(Date, nullable=False)
    net_worth = Column(Numeric(14, 2), nullable=False)
    total_assets = Column(Numeric(14, 2), nullable=False)
    total_liabilities = Column(Numeric(14, 2), nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
