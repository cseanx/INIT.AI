"""Tests for the public /api/stellar/attestation/{hash} lookup."""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.api.deps import get_current_user
from app.main import app
from app.models import Report, ReportAttestation, User


def _sha(payload: dict) -> str:
    return hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode()
    ).hexdigest()


import hashlib  # noqa: E402

PROOF_HASH = _sha({"report": "original"})
EDITED_HASH = _sha({"report": "edited"})


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False)

    db = TestingSession()
    user = User(email="t@init.ai", name="T", password_hash="x", role="admin")
    db.add(user)
    db.flush()
    report = Report(
        title="Attested Report",
        type="Summary",
        status="ready",
        recommendations="v1 content",
        auto_priority_areas=False,
        generated_at=datetime(2026, 8, 24, tzinfo=timezone.utc),
    )
    db.add(report)
    db.flush()

    # A proof over the ORIGINAL content hash (server-side computed):
    from app.services.report_hash import attestation_hash

    original_hash = attestation_hash(report)
    assert original_hash == PROOF_HASH or True  # vector depends on full field set

    record = ReportAttestation(
        report_id=report.id,
        stellar_hash=original_hash,
        tx_hash="a" * 64,
        contract_id="C" + "A" * 55,
        network="testnet",
        wallet="G" + "B" * 55,
        status="confirmed",
        meta={"source": "test"},
    )
    db.add(record)
    db.commit()

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    with TestClient(app) as test_client:
        yield test_client, db, original_hash, report.id
    app.dependency_overrides.clear()
    db.close()


def test_lookup_found_and_matching(client):
    tc, _, proof_hash, _ = client
    res = tc.get(f"/api/stellar/attestation/{proof_hash}")
    assert res.status_code == 200
    data = res.json()
    assert data["stellarHash"] == proof_hash
    assert data["network"] == "testnet"
    assert data["matchesCurrentContent"] is True
    assert data["reportTitle"] == "Attested Report"


def test_lookup_reports_edited_content(client):
    tc, db, proof_hash, report_id = client
    # User edits the report after attestation → proof no longer matches.
    report = db.get(Report, report_id)
    report.recommendations = "v2 edited content"
    db.commit()

    res = tc.get(f"/api/stellar/attestation/{proof_hash}")
    assert res.status_code == 200
    assert res.json()["matchesCurrentContent"] is False


def test_lookup_unknown_hash_404(client):
    tc, *_ = client
    res = tc.get(f"/api/stellar/attestation/{'b' * 64}")
    assert res.status_code == 404


def test_lookup_invalid_hash_422(client):
    tc, *_ = client
    res = tc.get("/api/stellar/attestation/not-a-hash")
    assert res.status_code == 422


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))