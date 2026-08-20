"""Drop the accent column from user_preferences (feature removed).

Revision ID: 0007_drop_accent
Revises: 0006_report_builder
Create Date: 2026-08-20
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007_drop_accent"
down_revision: Union[str, None] = "0006_report_builder"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("user_preferences", "accent")


def downgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column("accent", sa.String(length=20), server_default="sunset", nullable=False),
    )