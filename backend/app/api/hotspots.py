"""Real hotspot snapshots.

`/api/hotspots/latest` serves the newest persisted 8-day snapshot. If the
database has not been populated yet, it serves the bundled snapshot written by
`python -m app.jobs.hotspots_qc`. Both carry full provenance in `meta`; there
is no mock fallback here.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import HotspotSnapshot

router = APIRouter(prefix="/hotspots", tags=["hotspots"])

PILOT_CITY = "Quezon City"
BUNDLED_SNAPSHOT = (
    Path(__file__).resolve().parents[1] / "data" / "hotspots_qc_latest.json"
)


@router.get("/latest")
def latest_hotspots(
    city: str = Query(PILOT_CITY, min_length=1, max_length=120),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    snapshot = db.scalars(
        select(HotspotSnapshot)
        .where(HotspotSnapshot.city == city)
        .order_by(HotspotSnapshot.generated_at.desc())
        .limit(1)
    ).first()

    if snapshot is not None:
        payload = dict(snapshot.payload)
        meta = dict(payload.get("meta") or {})
        meta["storage"] = "database"
        payload["meta"] = meta
        return payload

    # The bundled fallback is the Quezon City pilot snapshot only. Never
    # return it for another city just because no city-specific row exists.
    if city == PILOT_CITY and BUNDLED_SNAPSHOT.exists():
        payload = json.loads(BUNDLED_SNAPSHOT.read_text(encoding="utf-8"))
        meta = dict(payload.get("meta") or {})
        meta["storage"] = "bundled"
        payload["meta"] = meta
        return payload

    raise HTTPException(
        status_code=404,
        detail=f"No hotspot snapshot is available for {city} yet.",
    )
