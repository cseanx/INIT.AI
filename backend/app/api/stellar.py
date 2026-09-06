"""Public Stellar verification endpoints.

Minimal by design — everything else lives under /reports (see reports.py).
Read-only: no wallet material ever reaches the backend.
Week 2 adds: GeoJSON hashing + RPC simulation proxy (both stdlib-only).
"""

import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import ReportAttestation
from app.services.geojson_hash import canonical_geojson, geojson_hash
from app.services.report_hash import attestation_hash
from app.services.stellar_simulate import (
    StellarRpcError,
    simulate_transaction,
)

router = APIRouter(prefix="/stellar", tags=["stellar"])

_HEX64 = re.compile(r"^[0-9a-f]{64}$")


class GeoJsonHashRequest(BaseModel):
    """Arbitrary GeoJSON object to hash deterministically (Week 2 pipeline)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    geojson: dict[str, Any]


class GeoJsonHashResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    canonical_json: str
    hash: str


class SimulateRequest(BaseModel):
    """Unsigned (or signed-but-unsubmitted) transaction envelope, base64 XDR."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    xdr: str

    @field_validator("xdr")
    @classmethod
    def _xdr_present(cls, value: str) -> str:
        if not value or len(value.strip()) < 16:
            raise ValueError("xdr must be a base64 transaction envelope.")
        return value.strip()


class SimulateResponse(BaseModel):
    """Structured simulation result with stable `code` (see docs/rpc-errors.md)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    ok: bool
    code: str
    message: str
    data: dict[str, Any] | None = None


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


@router.post("/geojson-hash", response_model=GeoJsonHashResponse)
def hash_geojson(body: GeoJsonHashRequest) -> GeoJsonHashResponse:
    """Week 2: SHA-256 GeoJSON hashing pipeline (deterministic, public).

    Accepts any GeoJSON object (FeatureCollection, Feature, Geometry),
    canonicalizes per `initai-canonical-v1` GeoJSON annex
    (`docs/canonical-v1.md` §2, `backend/app/services/geojson_hash.py`):
    sorted keys, 6-decimal coordinate rounding, compact UTF-8, SHA-256.
    """
    canonical = canonical_geojson(body.geojson)
    return GeoJsonHashResponse(canonical_json=canonical, hash=geojson_hash(body.geojson))


@router.post("/simulate", response_model=SimulateResponse)
def simulate(body: SimulateRequest) -> SimulateResponse:
    """Week 2: Soroban RPC simulation proxy with structured errors.

    Forwards the supplied (unsigned) XDR to Testnet `simulateTransaction`
    via `backend/app/services/stellar_simulate.py` (stdlib only, no keys).
    Returns stable `code` values documented in `docs/rpc-errors.md`:
    OK, DUPLICATE_HASH, UNKNOWN_PREV, REPORT_MISMATCH, CONTRACT_ERROR,
    INVALID_XDR. Transport failures surface as 502 with RPC_UNREACHABLE /
    RPC_HTTP_ERROR.
    """
    try:
        result = simulate_transaction(body.xdr, rpc_url=settings.stellar_rpc_url)
    except StellarRpcError as exc:
        status = 502 if exc.code in ("RPC_UNREACHABLE", "RPC_HTTP_ERROR") else 422
        raise HTTPException(status_code=status, detail={"code": exc.code, "message": str(exc), "detail": exc.detail})
    return SimulateResponse(ok=result.ok, code=result.code, message=result.message, data=result.data)


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