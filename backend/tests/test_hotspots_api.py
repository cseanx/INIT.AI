"""API tests for the real Quezon City hotspot snapshot endpoint."""

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
from app.main import app
from app.models import HotspotSnapshot


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app), TestingSession
    finally:
        app.dependency_overrides.clear()


def test_serves_bundled_qc_snapshot_when_database_is_empty(client):
    http, _ = client
    response = http.get("/api/hotspots/latest", params={"city": "Quezon City"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["storage"] == "bundled"
    assert payload["meta"]["city"] == "Quezon City"
    assert payload["meta"]["hotspot_count"] == len(payload["items"]) > 0
    assert payload["items"][0]["p90_lst"] > 0


def test_never_serves_qc_snapshot_for_another_city(client):
    http, _ = client
    response = http.get("/api/hotspots/latest", params={"city": "Manila"})

    assert response.status_code == 404
    assert "Manila" in response.json()["detail"]


def test_prefers_newest_database_snapshot(client):
    http, TestingSession = client
    with TestingSession() as db:
        db.add(
            HotspotSnapshot(
                city="Quezon City",
                period_start="2026-11-25",
                period_end="2026-12-02",
                generated_at=datetime.now(timezone.utc),
                source="test",
                method_version="test-v1",
                payload={
                    "meta": {
                        "city": "Quezon City",
                        "period_start": "2026-11-25",
                        "period_end": "2026-12-02",
                        "hotspot_count": 0,
                    },
                    "items": [],
                },
            )
        )
        db.commit()

    response = http.get("/api/hotspots/latest", params={"city": "Quezon City"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["storage"] == "database"
    assert payload["meta"]["period_start"] == "2026-11-25"
