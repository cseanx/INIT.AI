"""Public Stellar verification endpoints.

Minimal by design — everything else lives under /reports (see reports.py).
Read-only: no wallet material ever reaches the backend.
"""

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import ReportAttestation
from app.services.report_hash import attestation_hash

router = APIRouter(prefix="/stellar", tags=["stellar"])

_HEX64 = re.compile(r"^[0-9a-f]{64}$")


class AttestationLookup(BaseModel):
    """A proof resolved by hash, plus whether it still matches the report."""

    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    stellar_hash: str
    prev_hash: str | None = None
    tx_hash: str
    contract_id: str
    network: str
    wallet: str
    status: str
    created_at: object
    report_id: int
    report_title: str
    """True when the attested hash equals the report's CURRENT content hash."""
    matches_current_content: bool


@router.get("/attestation/{report_hash}", response_model=AttestationLookup)
def lookup_attestation(report_hash: str, db: Session = Depends(get_db)) -> AttestationLookup:
    """Resolve an attestation by its 64-hex SHA-256.

    Public by design: auditors verify proofs without authentication and
    without knowing which report produced them. `matchesCurrentContent`
    tells the caller whether the linked report has been edited since the
    proof was made.
    """
    if not _HEX64.match(report_hash):
        raise HTTPException(status_code=422, detail="reportHash must be 64 hex characters.")

    record = db.scalar(
        select(ReportAttestation).where(ReportAttestation.stellar_hash == report_hash)
    )
    if record is None:
        raise HTTPException(status_code=404, detail="No attestation exists for this hash.")

    matches = False
    if record.report is not None:
        matches = attestation_hash(record.report) == record.stellar_hash

    return AttestationLookup(
        stellar_hash=record.stellar_hash,
        prev_hash=record.prev_hash,
        tx_hash=record.tx_hash,
        contract_id=record.contract_id,
        network=record.network,
        wallet=record.wallet,
        status=record.status,
        created_at=record.created_at,
        report_id=record.report_id,
        report_title=record.report.title if record.report else "",
        matches_current_content=matches,
    )