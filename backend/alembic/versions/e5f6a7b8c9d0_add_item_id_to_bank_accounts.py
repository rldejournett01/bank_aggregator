"""Add item_id to bank_accounts

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('bank_accounts', sa.Column('item_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_bank_accounts_item_id'), 'bank_accounts', ['item_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_bank_accounts_item_id'), table_name='bank_accounts')
    op.drop_column('bank_accounts', 'item_id')
