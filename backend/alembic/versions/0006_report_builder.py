"""Add report-builder columns to the reports table.

Revision ID: 0006_report_builder
Revises: 0005_login_attempts
Create Date: 2026-08-20
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006_report_builder"
down_revision: Union[str, None] = "0005_login_attempts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("reports", sa.Column("city", sa.String(length=120), nullable=True))
    op.add_column("reports", sa.Column("coverage", sa.String(length=30), nullable=True))
    op.add_column("reports", sa.Column("period_start", sa.String(length=10), nullable=True))
    op.add_column("reports", sa.Column("period_end", sa.String(length=10), nullable=True))
    op.add_column("reports", sa.Column("prepared_by", sa.String(length=120), nullable=True))
    op.add_column("reports", sa.Column("area", sa.String(length=255), nullable=True))
    op.add_column(
        "reports",
        sa.Column("auto_priority_areas", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column(
        "reports",
        sa.Column("datasets", sa.JSON(), server_default=sa.text("'[]'::jsonb"), nullable=False),
    )
    op.add_column(
        "reports",
        sa.Column("areas", sa.JSON(), server_default=sa.text("'[]'::jsonb"), nullable=False),
    )
    op.add_column(
        "reports",
        sa.Column("sections", sa.JSON(), server_default=sa.text("'[]'::jsonb"), nullable=False),
    )
    op.add_column("reports", sa.Column("recommendations", sa.Text(), server_default="", nullable=False))
    op.add_column("reports", sa.Column("avg_surface_temp", sa.Float(), nullable=True))
    op.add_column("reports", sa.Column("peak_temp", sa.Float(), nullable=True))
    op.add_column("reports", sa.Column("peak_area", sa.String(length=120), nullable=True))
    op.add_column("reports", sa.Column("critical_count", sa.Integer(), nullable=True))
    op.add_column("reports", sa.Column("high_count", sa.Integer(), nullable=True))
    op.add_column("reports", sa.Column("moderate_count", sa.Integer(), nullable=True))
    op.add_column("reports", sa.Column("avg_canopy", sa.Float(), nullable=True))
    op.add_column("reports", sa.Column("mitigation_projects", sa.Integer(), nullable=True))
    op.add_column("reports", sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("reports", "generated_at")
    op.drop_column("reports", "mitigation_projects")
    op.drop_column("reports", "avg_canopy")
    op.drop_column("reports", "moderate_count")
    op.drop_column("reports", "high_count")
    op.drop_column("reports", "critical_count")
    op.drop_column("reports", "peak_area")
    op.drop_column("reports", "peak_temp")
    op.drop_column("reports", "avg_surface_temp")
    op.drop_column("reports", "recommendations")
    op.drop_column("reports", "sections")
    op.drop_column("reports", "areas")
    op.drop_column("reports", "datasets")
    op.drop_column("reports", "auto_priority_areas")
    op.drop_column("reports", "area")
    op.drop_column("reports", "prepared_by")
    op.drop_column("reports", "period_end")
    op.drop_column("reports", "period_start")
    op.drop_column("reports", "coverage")
    op.drop_column("reports", "city")