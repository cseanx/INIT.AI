"""Create login_attempts table for persistent login guard.

Revision ID: 0005_login_attempts
Revises: 0004_user_preferences_accent
Create Date: 2026-08-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_login_attempts"
down_revision: Union[str, None] = "0004_user_preferences_accent"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "login_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "last_failure_at",
            sa.DateTime(timezone=True),
            nullable=True,
            default=None,
        ),
        sa.Column(
            "locked_until",
            sa.DateTime(timezone=True),
            nullable=True,
            default=None,
        ),
    )
    op.create_index("ix_login_attempts_key", "login_attempts", ["key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_login_attempts_key", table_name="login_attempts")
    op.drop_table("login_attempts")