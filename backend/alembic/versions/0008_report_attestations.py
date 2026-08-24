"""Create report_attestations — off-chain Stellar attestation records.

Revision ID: 0008_report_attestations
Revises: 0007_drop_accent
Create Date: 2026-08-24
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0008_report_attestations"
down_revision: Union[str, None] = "0007_drop_accent"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "report_attestations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "report_id",
            sa.Integer(),
            sa.ForeignKey("reports.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("stellar_hash", sa.String(length=64), nullable=False),
        sa.Column("tx_hash", sa.String(length=64), nullable=False),
        sa.Column("contract_id", sa.String(length=56), nullable=False),
        sa.Column("network", sa.String(length=20), server_default="testnet", nullable=False),
        sa.Column("wallet", sa.String(length=56), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="confirmed", nullable=False),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_report_attestations_stellar_hash", "report_attestations", ["stellar_hash"], unique=True
    )
    op.create_index(
        "ix_report_attestations_tx_hash", "report_attestations", ["tx_hash"]
    )


def downgrade() -> None:
    op.drop_table("report_attestations")