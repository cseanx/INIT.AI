"""API tests for the report attestation endpoints.

Uses an in-memory SQLite database with auth overridden, so the full
request/response cycle is exercised without PostgreSQL or a session cookie.
Run: `python -m pytest tests/test_attestation_api.py -q`
"""

import hashlib
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
from app.models import Report, User


def _sha(payload: dict) -> str:
    return hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode()
    ).hexdigest()


VALID_BODY = {
    "reportHash": _sha({"x": 1}),  # replaced per-test with the real content hash
    "txHash": "66a6900a24fa4851a5730352af35e1bf5ca8e963ee2fb6d712e7202fd75318f6",
    "contractId": "CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4",
    "network": "testnet",
    "wallet": "GBBU32EB3VNOIGDS6GUJ6JWWONQ6NP73BRG6IVE5D4BV3LCTYEJJFAHY",
    "meta": {"source": "test"},
}


@pytest.fixture()
def client(monkeypatch):
    # One shared in-memory DB across all connections (TestClient opens new ones).
    engine = create_engine(
        "sqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False)

    db = TestingSession()
    user = User(email="t@init.ai", name="Tester", password_hash="x", role="admin")
    db.add(user)
    db.flush()
    report = Report(
        title="Q3 Urban Heat Island Summary",
        type="Summary",
        status="ready",
        city="Quezon City",
        coverage="Entire city",
        prepared_by="Juan",
        auto_priority_areas=True,
        datasets=["Surface Temp"],
        areas=[],
        sections=["summary"],
        recommendations="Plant more trees.",
        avg_surface_temp=36.0,
        critical_count=1,
        high_count=2,
        moderate_count=3,
        avg_canopy=18.0,
        mitigation_projects=1,
        generated_at=datetime(2026, 8, 1, tzinfo=timezone.utc),
    )
    db.add(report)
    db.commit()

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user

    # Stub the Horizon verifier so API tests don't touch the network.
    from app.api import reports as reports_module
    from app.services import stellar_verify as sv

    monkeypatch.setattr(
        reports_module,
        "verify_attest_transaction",
        lambda *args, **kwargs: {"ledger": 1, "verified_via": "stub"},
    )

    with TestClient(app) as test_client:
        # The authoritative hash for this stored row:
        VALID_BODY["reportHash"] = test_client.get("/api/reports/1/attestation-message").json()["hash"]
        yield test_client, db
    app.dependency_overrides.clear()
    db.close()


def test_record_and_list_attestation(client):
    tc, _ = client
    res = tc.post("/api/reports/1/attestation", json=VALID_BODY)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["status"] == "confirmed"
    assert data["network"] == "testnet"
    assert data["stellarHash"] == VALID_BODY["reportHash"]

    listed = tc.get("/api/reports/1/attestation").json()
    assert len(listed) == 1
    assert listed[0]["txHash"] == VALID_BODY["txHash"]


def test_requires_authentication(client):
    tc, _ = client
    app.dependency_overrides.pop(get_current_user)
    res = tc.post("/api/reports/1/attestation", json=VALID_BODY)
    assert res.status_code == 401


def test_rejects_mainnet(client):
    tc, _ = client
    body = {**VALID_BODY, "network": "mainnet"}
    res = tc.post("/api/reports/1/attestation", json=body)
    assert res.status_code == 422


def test_rejects_bad_shapes(client):
    tc, _ = client
    for field, bad in [
        ("reportHash", "zz"),
        ("txHash", "nope"),
        ("wallet", "X" + VALID_BODY["wallet"][1:]),
        ("contractId", "not-a-contract"),
    ]:
        body = {**VALID_BODY, field: bad}
        res = tc.post("/api/reports/1/attestation", json=body)
        assert res.status_code == 422, f"{field}={bad!r} should fail"


def test_hash_mismatch_is_conflict(client):
    tc, _ = client
    body = {**VALID_BODY, "reportHash": "a" * 64}
    res = tc.post("/api/reports/1/attestation", json=body)
    assert res.status_code == 409
    assert "mismatch" in res.json()["detail"]


def test_idempotent_resubmit_updates_not_duplicates(client):
    tc, db = client
    first = tc.post("/api/reports/1/attestation", json=VALID_BODY)
    assert first.status_code == 201

    body = {
        **VALID_BODY,
        "txHash": "f" * 64,  # re-submit with corrected tx pointer
        "meta": {"source": "retry"},
    }
    second = tc.post("/api/reports/1/attestation", json=body)
    assert second.status_code in (200, 201)
    assert second.json()["txHash"] == "f" * 64

    rows = tc.get("/api/reports/1/attestation").json()
    assert len(rows) == 1


def test_report_list_includes_attestation_summary(client):
    tc, _ = client
    # Before attesting: no proofs recorded for this report.
    before = tc.get("/api/reports").json()[0]
    assert before["attestationCount"] == 0
    assert before["attestedCurrent"] is False
    assert before["attestedAt"] is None

    res = tc.post("/api/reports/1/attestation", json=VALID_BODY)
    assert res.status_code == 201, res.text

    after_list = tc.get("/api/reports").json()[0]
    assert after_list["attestationCount"] == 1
    assert after_list["attestedCurrent"] is True
    assert after_list["attestedAt"]

    single = tc.get("/api/reports/1").json()
    assert single["attestedCurrent"] is True
    assert single["attestationCount"] == 1


def test_edited_report_reports_outdated_proof(client):
    tc, db = client
    res = tc.post("/api/reports/1/attestation", json=VALID_BODY)
    assert res.status_code == 201

    # Edit content → the existing proof no longer matches the current hash.
    patch = {"recommendations": "Updated after proof."}
    edited = tc.put("/api/reports/1", json=patch)
    assert edited.status_code == 200
    assert edited.json()["attestedCurrent"] is False
    assert edited.json()["attestationCount"] == 1

    listed = tc.get("/api/reports").json()[0]
    assert listed["attestedCurrent"] is False
    assert listed["attestationCount"] == 1

    # Re-attesting the new content restores verified status.
    message = tc.get("/api/reports/1/attestation-message").json()
    body = {**VALID_BODY, "reportHash": message["hash"], "txHash": "e" * 64}
    assert tc.post("/api/reports/1/attestation", json=body).status_code == 201
    relisted = tc.get("/api/reports").json()[0]
    assert relisted["attestedCurrent"] is True
    assert relisted["attestationCount"] == 2


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))