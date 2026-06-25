"""Add plaid_cursor and last_synced_at to linked_accounts

Revision ID: a1b2c3d4e5f6
Revises: cb5f48db8d2d
Create Date: 2026-06-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'cb5f48db8d2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('linked_accounts', sa.Column('plaid_cursor', sa.String(), nullable=True))
    op.add_column('linked_accounts', sa.Column('last_synced_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('linked_accounts', 'last_synced_at')
    op.drop_column('linked_accounts', 'plaid_cursor')
