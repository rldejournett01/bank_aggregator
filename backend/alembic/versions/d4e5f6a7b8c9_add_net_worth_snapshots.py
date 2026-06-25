"""Add net_worth_snapshots table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-24 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'net_worth_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('captured_on', sa.Date(), nullable=False),
        sa.Column('net_worth', sa.Numeric(14, 2), nullable=False),
        sa.Column('total_assets', sa.Numeric(14, 2), nullable=False),
        sa.Column('total_liabilities', sa.Numeric(14, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'captured_on', name='uq_networth_user_day'),
    )
    op.create_index(
        op.f('ix_net_worth_snapshots_user_id'), 'net_worth_snapshots', ['user_id'], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_net_worth_snapshots_user_id'), table_name='net_worth_snapshots')
    op.drop_table('net_worth_snapshots')
