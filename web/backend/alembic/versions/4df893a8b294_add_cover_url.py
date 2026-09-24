"""Add cover_url

Revision ID: 4df893a8b294
Revises: 3c034b0fc897
Create Date: 2026-08-19 10:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4df893a8b294'
down_revision: Union[str, Sequence[str], None] = '3c034b0fc897'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('cover_url', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'cover_url')
