from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models import Barangay, Report, ReportAttestation, User
from app.schemas.report import (
    ReportAttestationCreate,
    ReportAttestationMessage,
    ReportAttestationOut,
    ReportCreate,
    ReportOut,
    ReportUpdate,
)
from app.services.readings import fetch_all
from app.services.report_hash import attestation_hash, canonical_json
from app.services.stellar_verify import (
    TransactionVerificationError,
    verify_attest_transaction,
)

router = APIRouter(prefix="/reports", tags=["reports"])


def _get_report(db: Session, report_id: int) -> Report:
    report = db.scalar(
        select(Report).options(joinedload(Report.barangay)).where(Report.id == report_id)
    )
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("", response_model=list[ReportOut])
def list_reports(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[Report]:
    statement = select(Report).options(
        joinedload(Report.barangay)
    ).order_by(Report.created_at.desc())
    return fetch_all(db, statement, limit)


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)) -> Report:
    return _get_report(db, report_id)


@router.get(
    "/{report_id}/attestation-message",
    response_model=ReportAttestationMessage,
)
def get_attestation_message(report_id: int, db: Session = Depends(get_db)) -> ReportAttestationMessage:
    """Server-authoritative Stellar attestation message for a report.

    The hash covers report CONTENT only (no ids/timestamps added by the
    database), so editing a report intentionally invalidates old proofs.
    """
    report = _get_report(db, report_id)
    return ReportAttestationMessage(
        report_id=str(report.id),
        hash=attestation_hash(report),
        canonical_payload=canonical_json(report),
    )


@router.get("/{report_id}/attestation", response_model=list[ReportAttestationOut])
def list_attestations(report_id: int, db: Session = Depends(get_db)) -> list[ReportAttestation]:
    _get_report(db, report_id)  # 404 guard
    statement = (
        select(ReportAttestation)
        .where(ReportAttestation.report_id == report_id)
        .order_by(ReportAttestation.created_at.desc())
    )
    return list(db.scalars(statement))


@router.post(
    "/{report_id}/attestation",
    response_model=ReportAttestationOut,
    status_code=status.HTTP_201_CREATED,
)
def record_attestation(
    report_id: int,
    body: ReportAttestationCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> ReportAttestation:
    """Persist an on-chain attestation after a confirmed Soroban invocation.

    The submitted hash is checked against the server-authoritative content
    hash â€” a mismatch (report edited after signing) is rejected with 409.
    Re-submitting the same hash is an idempotent update; a new hash (report
    was edited and re-attested) starts a new proof row.
    """
    report = _get_report(db, report_id)

    expected = attestation_hash(report)
    if body.report_hash != expected:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Report hash mismatch â€” the stored report content differs from "
                f"what was signed. Expected {expected}. Re-open the report to "
                "attest its current form."
            ),
        )

    # Trust nothing: confirm on Testnet that this exact transaction exists,
    # succeeded, and invoked attest() with this wallet, hash and report ref.
    # The contract id is pinned to THIS deployment's configured value â€” the
    # client-supplied id is only cross-checked for a clear error message.
    if body.contract_id != settings.stellar_contract_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Unknown contract id â€” this deployment verifies attestations "
                f"against {settings.stellar_contract_id}."
            ),
        )
    try:
        horizon_meta = verify_attest_transaction(
            body.tx_hash,
            expected_contract_id=settings.stellar_contract_id,
            expected_hash_hex=body.report_hash,
            expected_report_ref=str(report.id),
            expected_wallet=body.wallet,
            horizon_base=settings.stellar_horizon_base,
        )
    except TransactionVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    verification_meta = {**(body.meta or {}), **horizon_meta, "verified_at": datetime.now(timezone.utc).isoformat()}

    existing = db.scalar(
        select(ReportAttestation).where(ReportAttestation.stellar_hash == body.report_hash)
    )
    if existing is not None:
        if existing.report_id != report.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This report hash is already attested under a different report.",
            )
        # Idempotent re-submit: refresh chain pointers/metadata.
        existing.tx_hash = body.tx_hash
        existing.contract_id = settings.stellar_contract_id
        existing.network = body.network
        existing.wallet = body.wallet
        existing.status = "confirmed"
        existing.meta = verification_meta
        existing.last_verified_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    record = ReportAttestation(
        report_id=report.id,
        stellar_hash=body.report_hash,
        tx_hash=body.tx_hash,
        contract_id=settings.stellar_contract_id,
        network=body.network,
        wallet=body.wallet,
        status="confirmed",
        meta=verification_meta,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    body: ReportCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> Report:
    data = body.model_dump(exclude={"area"})
    report = Report(**data)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.put("/{report_id}", response_model=ReportOut)
def update_report(
    report_id: int,
    body: ReportUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> Report:
    report = _get_report(db, report_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(report, field, value)
    db.commit()
    db.refresh(report)
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> None:
    report = _get_report(db, report_id)
    db.delete(report)
    db.commit()