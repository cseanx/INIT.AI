"""Idempotent schema maintenance for serverless deployments.

`Base.metadata.create_all` only creates missing *tables* — it never adds
columns to existing ones. The report builder added columns to the `reports`
table, so every cold start runs additive `ALTER TABLE ... ADD COLUMN IF NOT
EXISTS` statements to bring existing databases up to date without needing a
manual migration step. Alembic migrations (see alembic/) remain the canonical
source for local development and fresh databases.
"""

from sqlalchemy import Engine, text

_REPORTS_ALTERS = [
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS city VARCHAR(120)",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS coverage VARCHAR(30)",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS period_start VARCHAR(10)",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS period_end VARCHAR(10)",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS prepared_by VARCHAR(120)",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS area VARCHAR(255)",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS auto_priority_areas BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS datasets JSONB NOT NULL DEFAULT '[]'::jsonb",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS areas JSONB NOT NULL DEFAULT '[]'::jsonb",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '[]'::jsonb",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS recommendations TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS avg_surface_temp DOUBLE PRECISION",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS peak_temp DOUBLE PRECISION",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS peak_area VARCHAR(120)",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS critical_count INTEGER",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS high_count INTEGER",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS moderate_count INTEGER",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS avg_canopy DOUBLE PRECISION",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS mitigation_projects INTEGER",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ",
]

_REPORT_ATTESTATION_ALTERS = [
    "ALTER TABLE report_attestations ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64)",
]

_USER_ALTERS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(120)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
]


def ensure_report_columns(engine: Engine) -> None:
    """Add missing columns on the `reports` table (no-op when present)."""
    with engine.begin() as connection:
        for statement in _REPORTS_ALTERS:
            connection.execute(text(statement))


def ensure_attestation_columns(engine: Engine) -> None:
    """Add missing columns on the `report_attestations` table."""
    with engine.begin() as connection:
        for statement in _REPORT_ATTESTATION_ALTERS:
            connection.execute(text(statement))


def ensure_attestation_indexes(engine: Engine) -> None:
    """Upgrade attestation uniqueness from global hash to (hash, network).

    Older databases have a UNIQUE index on stellar_hash alone, which would
    block the same report version from being proven on both Testnet and
    Mainnet. Postgres-only; SQLite test databases are created from the current
    model. No-op once upgraded.
    """
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM pg_index i
                        JOIN pg_class c ON c.oid = i.indexrelid
                        WHERE c.relname = 'ix_report_attestations_stellar_hash'
                          AND i.indisunique
                    ) THEN
                        DROP INDEX ix_report_attestations_stellar_hash;
                    END IF;
                END $$;
                """
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_report_attestations_stellar_hash "
                "ON report_attestations (stellar_hash)"
            )
        )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_report_attestations_hash_network "
                "ON report_attestations (stellar_hash, network)"
            )
        )


def ensure_user_columns(engine: Engine) -> None:
    """Add missing columns on `users` for account expansion (no-op when present)."""
    with engine.begin() as connection:
        for statement in _USER_ALTERS:
            connection.execute(text(statement))