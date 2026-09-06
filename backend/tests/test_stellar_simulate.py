"""Tests for Week 2 simulation proxy (mocked RPC, no network).

Run: `python -m pytest tests/test_stellar_simulate.py -q` (from `backend/`).
"""

import sys
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
from app.models import User
from app.services import stellar_simulate as sim


@pytest.fixture()
def client(monkeypatch):
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False)
    db = TestingSession()
    user = User(email="t@init.ai", name="T", password_hash="x", role="admin")
    db.add(user)
    db.commit()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    with TestClient(app) as tc:
        yield tc
    app.dependency_overrides.clear()
    db.close()


def _mock_rpc(monkeypatch, payload):
    monkeypatch.setattr(sim, "_rpc_post", lambda rpc_url, method, params: payload)


def test_simulate_ok(monkeypatch, client):
    _mock_rpc(monkeypatch, {"result": {"results": [{"xdr": "AAAA"}], "cost": {"cpuInsns": "1"}}})
    res = client.post("/api/stellar/simulate", json={"xdr": "QUJDREVGR0hJSktMTU5PUA=="})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["code"] == "OK"


def test_simulate_duplicate_maps_code(monkeypatch, client):
    _mock_rpc(
        monkeypatch,
        {"result": {"error": "HostError: attestation already exists for this report hash"}},
    )
    res = client.post("/api/stellar/simulate", json={"xdr": "QUJDREVGR0hJSktMTU5PUA=="})
    assert res.status_code == 200
    assert res.json()["code"] == "DUPLICATE_HASH"
    assert res.json()["ok"] is False


def test_simulate_unknown_prev_maps_code(monkeypatch, client):
    _mock_rpc(monkeypatch, {"result": {"error": "panic: prev_hash references unknown attestation"}})
    res = client.post("/api/stellar/simulate", json={"xdr": "QUJDREVGR0hJSktMTU5PUA=="})
    assert res.json()["code"] == "UNKNOWN_PREV"


def test_simulate_report_mismatch_maps_code(monkeypatch, client):
    _mock_rpc(monkeypatch, {"result": {"error": "prev_hash must reference same report_id"}})
    res = client.post("/api/stellar/simulate", json={"xdr": "QUJDREVGR0hJSktMTU5PUA=="})
    assert res.json()["code"] == "REPORT_MISMATCH"


def test_simulate_rpc_unreachable_502(monkeypatch, client):
    def boom(rpc_url, method, params):
        raise sim.StellarRpcError("RPC_UNREACHABLE", "Could not reach the Stellar Testnet (RPC error).")

    monkeypatch.setattr(sim, "_rpc_post", boom)
    res = client.post("/api/stellar/simulate", json={"xdr": "QUJDREVGR0hJSktMTU5PUA=="})
    assert res.status_code == 502
    assert res.json()["detail"]["code"] == "RPC_UNREACHABLE"


def test_simulate_invalid_xdr_422(client):
    res = client.post("/api/stellar/simulate", json={"xdr": "short"})
    assert res.status_code == 422


def test_geojson_hash_endpoint(client):
    fc = {"type": "FeatureCollection", "features": []}
    res = client.post("/api/stellar/geojson-hash", json={"geojson": fc})
    assert res.status_code == 200, res.text
    data = res.json()
    assert len(data["hash"]) == 64
    assert '"features":[]' in data["canonicalJson"]


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
