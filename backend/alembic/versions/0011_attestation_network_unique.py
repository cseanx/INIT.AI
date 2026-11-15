"""Allow the same content hash on Testnet and Mainnet.

Attestation uniqueness becomes (stellar_hash, network) instead of a global
unique hash, so a report version can carry independent proofs on both chains.

Revision ID: 0011_attestation_network_unique
Revises: 0010_account_expansion
Create Date: 2026-11-15
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0011_attestation_network_unique"
down_revision: Union[str, None] = "0010_account_expansion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old global unique index, then recreate it non-unique.
    op.drop_index(
        "ix_report_attestations_stellar_hash",
        table_name="report_attestations",
    )
    op.create_index(
        "ix_report_attestations_stellar_hash",
        "report_attestations",
        ["stellar_hash"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_report_attestations_hash_network",
        "report_attestations",
        ["stellar_hash", "network"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_report_attestations_hash_network",
        "report_attestations",
        type_="unique",
    )
    op.drop_index(
        "ix_report_attestations_stellar_hash",
        table_name="report_attestations",
    )
    op.create_index(
        "ix_report_attestations_stellar_hash",
        "report_attestations",
        ["stellar_hash"],
        unique=True,
    )
