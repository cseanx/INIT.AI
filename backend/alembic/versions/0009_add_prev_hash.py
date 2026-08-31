"""Add prev_hash — on-chain revision link for attestations.

Revision ID: 0009_add_prev_hash
Revises: 0008_report_attestations
Create Date: 2026-08-31
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009_add_prev_hash"
down_revision: Union[str, None] = "0008_report_attestations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "report_attestations",
        sa.Column("prev_hash", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_report_attestations_prev_hash", "report_attestations", ["prev_hash"]
    )


def downgrade() -> None:
    op.drop_index("ix_report_attestations_prev_hash", table_name="report_attestations")
    op.drop_column("report_attestations", "prev_hash")
