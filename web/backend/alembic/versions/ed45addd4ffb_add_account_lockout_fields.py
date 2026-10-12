"""add account lockout fields

Revision ID: ed45addd4ffb
Revises: 4df893a8b294
Create Date: 2026-10-12 12:35:36.807936

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed45addd4ffb'
down_revision: Union[str, Sequence[str], None] = '4df893a8b294'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "failed_login_attempts",
            sa.Integer(),
            nullable=False,
            server_default="0"
        )
    )

    op.add_column(
        "users",
        sa.Column(
            "locked_until",
            sa.DateTime(),
            nullable=True
        )
    )


def downgrade() -> None:
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_attempts")