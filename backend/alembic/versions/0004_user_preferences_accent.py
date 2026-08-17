"""Add accent column to user_preferences.

Revision ID: 0004_user_preferences_accent
Revises: 0003_user_preferences
Create Date: 2026-08-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004_user_preferences_accent"
down_revision: Union[str, None] = "0003_user_preferences"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column(
            "accent",
            sa.String(length=20),
            server_default="sunset",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("user_preferences", "accent")
