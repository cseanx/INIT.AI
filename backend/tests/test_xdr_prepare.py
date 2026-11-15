"""Tests for Week 2 XDR-prepare endpoint.

Run: `python -m pytest tests/test_xdr_prepare.py -q` (from `backend/`).
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.api.deps import get_current_user
from app.main import app
from app.models import Report, ReportAttestation, User
from app.services.report_hash import attestation_hash


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
        title="XDR Prepare Report",
        type="Summary",
        status="ready",
        city="Quezon City",
        recommendations="v1",
        auto_priority_areas=False,
        generated_at=datetime(2026, 8, 31, tzinfo=timezone.utc),
    )
    db.add(report)
    db.flush()

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    with TestClient(app) as tc:
        yield tc, db, report
    app.dependency_overrides.clear()
    db.close()


def test_xdr_prepare_first_version_has_null_prev(client):
    tc, db, report = client
    res = tc.get(f"/api/reports/{report.id}/xdr-prepare")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["reportId"] == str(report.id)
    assert data["hash"] == attestation_hash(report)
    assert data["prevHash"] is None
    assert data["function"] == "attest"
    assert data["network"] == "testnet"
    assert len(data["args"]) == 4
    assert data["args"][1]["value"] == data["hash"]
    assert data["args"][3]["value"] is None
    assert data["canonicalPayload"]


def test_xdr_prepare_revision_links_prev(client):
    tc, db, report = client
    # Attest v1 first (confirmed proof for current content)
    from app.services.report_hash import attestation_hash as ah

    h1 = ah(report)
    db.add(
        ReportAttestation(
            report_id=report.id,
            stellar_hash=h1,
            prev_hash=None,
            tx_hash="a" * 64,
            contract_id="C" + "A" * 55,
            network="testnet",
            wallet="G" + "B" * 55,
            status="confirmed",
        )
    )
    db.commit()

    # Edit report -> new content hash; xdr-prepare must link prev=h1
    report.recommendations = "v2 edited"
    db.commit()

    res = tc.get(f"/api/reports/{report.id}/xdr-prepare")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["hash"] != h1
    assert data["prevHash"] == h1
    assert data["args"][3]["value"] == h1


def test_xdr_prepare_mainnet_disabled_by_default(client):
    tc, _, report = client
    res = tc.get(f"/api/reports/{report.id}/xdr-prepare?network=mainnet")
    assert res.status_code == 422
    assert "Mainnet is not enabled" in res.json()["detail"]


def test_xdr_prepare_mainnet_when_configured(client, monkeypatch):
    tc, _, report = client
    mainnet_contract = "C" + "B" * 55
    monkeypatch.setattr(settings, "stellar_mainnet_contract_id", mainnet_contract)
    monkeypatch.setattr(settings, "stellar_mainnet_ack", True)

    res = tc.get(f"/api/reports/{report.id}/xdr-prepare?network=mainnet")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["network"] == "mainnet"
    assert data["contractId"] == mainnet_contract
    assert data["rpcUrl"] == "https://soroban-mainnet.stellar.org"


def test_xdr_prepare_scopes_prev_hash_per_network(client, monkeypatch):
    """A Testnet proof must not become the Mainnet revision parent."""
    tc, db, report = client
    h1 = attestation_hash(report)
    db.add(
        ReportAttestation(
            report_id=report.id,
            stellar_hash=h1,
            prev_hash=None,
            tx_hash="b" * 64,
            contract_id="C" + "A" * 55,
            network="testnet",
            wallet="G" + "B" * 55,
            status="confirmed",
        )
    )
    db.commit()
    report.recommendations = "v2 network-scoped"
    db.commit()

    monkeypatch.setattr(settings, "stellar_mainnet_contract_id", "C" + "B" * 55)
    monkeypatch.setattr(settings, "stellar_mainnet_ack", True)

    testnet = tc.get(f"/api/reports/{report.id}/xdr-prepare?network=testnet").json()
    mainnet = tc.get(f"/api/reports/{report.id}/xdr-prepare?network=mainnet").json()
    assert testnet["prevHash"] == h1
    assert mainnet["prevHash"] is None
    assert mainnet["contractId"] != testnet["contractId"]


def test_xdr_prepare_rejects_unknown_network(client):
    tc, _, report = client
    res = tc.get(f"/api/reports/{report.id}/xdr-prepare?network=futurenet")
    assert res.status_code == 422


def test_xdr_prepare_404_for_unknown_report(client):
    tc, _, _ = client
    assert tc.get("/api/reports/99999/xdr-prepare").status_code == 404


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
