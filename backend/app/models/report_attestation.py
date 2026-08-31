from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReportAttestation(Base):
    """Off-chain record of one Stellar attestation for a report.

    One row per (report, content-hash): editing a report changes its hash,
    and each version keeps its own proof history here. The report body is
    NEVER duplicated — only chain metadata lives in this table.
    """

    __tablename__ = "report_attestations"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), index=True
    )

    # 64-hex SHA-256 of the canonical payload — unique per proof.
    stellar_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # 64-hex SHA-256 of the previous version's hash — on-chain revision link.
    # Null for the first version of a report, set for every later edit.
    prev_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, default=None)
    # 64-char Stellar transaction hash on Testnet.
    tx_hash: Mapped[str] = mapped_column(String(64), index=True)
    # Soroban contract that holds the proof ("C…", 56 chars).
    contract_id: Mapped[str] = mapped_column(String(56))
    # 'testnet' only for now.
    network: Mapped[str] = mapped_column(String(20), server_default="testnet")
    # Submitting wallet public key ("G…", 56 chars).
    wallet: Mapped[str] = mapped_column(String(56))

    # pending | confirmed | failed | verified
    status: Mapped[str] = mapped_column(String(20), server_default="confirmed")

    # Free-form verification metadata (e.g. {"source": "web"}).
    meta: Mapped[dict | None] = mapped_column(JSON, default=None)
    last_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    report: Mapped["Report"] = relationship(back_populates="attestations")  # type: ignore[name-defined]
