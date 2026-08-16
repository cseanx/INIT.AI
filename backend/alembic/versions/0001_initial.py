"""Initial INIT.AI schema: users, cities, barangays, heat, canopy,
mitigation projects, reports.

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=40), server_default="viewer", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "cities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("region", sa.String(length=120), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("name", name="uq_cities_name"),
    )

    op.create_table(
        "barangays",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "city_id",
            sa.Integer(),
            sa.ForeignKey("cities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("city_id", "name", name="uq_barangays_city_id_name"),
    )
    op.create_index("ix_barangays_city_id", "barangays", ["city_id"])

    op.create_table(
        "heat_data",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "barangay_id",
            sa.Integer(),
            sa.ForeignKey("barangays.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("temperature", sa.Numeric(precision=4, scale=1), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_heat_data_barangay_id", "heat_data", ["barangay_id"])
    op.create_index("ix_heat_data_recorded_at", "heat_data", ["recorded_at"])

    op.create_table(
        "canopy_data",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "barangay_id",
            sa.Integer(),
            sa.ForeignKey("barangays.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("canopy_percentage", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_canopy_data_barangay_id", "canopy_data", ["barangay_id"])
    op.create_index("ix_canopy_data_recorded_at", "canopy_data", ["recorded_at"])

    op.create_table(
        "mitigation_projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "barangay_id",
            sa.Integer(),
            sa.ForeignKey("barangays.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column(
            "status",
            sa.String(length=30),
            server_default="Proposed",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_mitigation_projects_barangay_id", "mitigation_projects", ["barangay_id"]
    )

    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=60), nullable=False),
        sa.Column(
            "barangay_id",
            sa.Integer(),
            sa.ForeignKey("barangays.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(length=30), server_default="ready", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_reports_barangay_id", "reports", ["barangay_id"])


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("mitigation_projects")
    op.drop_table("canopy_data")
    op.drop_table("heat_data")
    op.drop_table("barangays")
    op.drop_table("cities")
    op.drop_table("users")
