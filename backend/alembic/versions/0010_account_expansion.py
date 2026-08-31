"""Account expansion: organization, email_verified, updated_at + token tables.

Revision ID: 0010_account_expansion
Revises: 0009_add_prev_hash
Create Date: 2026-08-31
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_account_expansion"
down_revision: Union[str, None] = "0009_add_prev_hash"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extend users
    op.add_column("users", sa.Column("organization", sa.String(length=120), nullable=True))
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "users",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    # Existing users (seeded before verification existed) must remain functional.
    # Mark them verified so they are not locked out after migration.
    op.execute(sa.text("UPDATE users SET email_verified = true WHERE email_verified = false"))

    # Verification tokens
    op.create_table(
        "verification_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_verification_tokens_user_id", "verification_tokens", ["user_id"])
    op.create_index("ix_verification_tokens_token_hash", "verification_tokens", ["token_hash"], unique=True)

    # Password reset tokens
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=True)

    # Email change tokens
    op.create_table(
        "email_change_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("new_email", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_email_change_tokens_user_id", "email_change_tokens", ["user_id"])
    op.create_index("ix_email_change_tokens_token_hash", "email_change_tokens", ["token_hash"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_email_change_tokens_token_hash", table_name="email_change_tokens")
    op.drop_index("ix_email_change_tokens_user_id", table_name="email_change_tokens")
    op.drop_table("email_change_tokens")

    op.drop_index("ix_password_reset_tokens_token_hash", table_name="password_reset_tokens")
    op.drop_index("ix_password_reset_tokens_user_id", table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")

    op.drop_index("ix_verification_tokens_token_hash", table_name="verification_tokens")
    op.drop_index("ix_verification_tokens_user_id", table_name="verification_tokens")
    op.drop_table("verification_tokens")

    op.drop_column("users", "updated_at")
    op.drop_column("users", "email_verified")
    op.drop_column("users", "organization")
