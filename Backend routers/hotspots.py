"""
Hotspots router — /hotspots
Full CRUD with PostGIS spatial filtering.
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from geoalchemy2.functions import ST_AsGeoJSON, ST_DWithin, ST_MakePoint, ST_SetSRID
import json

from models.database import get_db
from models.orm import Hotspot, LSTTimeSeries, City, Profile
from models.schemas import HotspotOut, HotspotCreate, HotspotUpdate, ThermalTimeSeriesResponse, LSTDataPoint
from utils.auth import get_current_active_user, require_planner
from utils.spatial import make_point_wkt, point_to_geojson

router = APIRouter()


def _hotspot_to_out(h: Hotspot, geojson: dict = None) -> HotspotOut:
    out = HotspotOut.model_validate(h)
    if geojson:
        out.location = geojson
    return out


@router.get("/", response_model=List[HotspotOut], summary="List all hotspots with optional filters")
async def list_hotspots(
    city_name:    Optional[str]  = Query(None, description="Filter by city name"),
    severity:     Optional[str]  = Query(None, description="Filter: critical|high|moderate|low"),
    is_active:    bool           = Query(True),
    limit:        int            = Query(50, le=200),
    offset:       int            = Query(0),
    sort_by:      str            = Query("lst", description="lst|zone_id|severity"),
    sort_dir:     str            = Query("desc"),
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    q = select(Hotspot).where(Hotspot.is_active == is_active)

    if city_name:
        city_res = await db.execute(select(City).where(City.name == city_name))
        city = city_res.scalar_one_or_none()
        if city:
            q = q.where(Hotspot.city_id == city.id)

    if severity:
        q = q.where(Hotspot.severity == severity)

    order_col = getattr(Hotspot, sort_by, Hotspot.lst)
    q = q.order_by(desc(order_col) if sort_dir == "desc" else order_col)
    q = q.offset(offset).limit(limit)

    result = await db.execute(q)
    hotspots = result.scalars().all()

    out = []
    for h in hotspots:
        geojson = None
        if h.location is not None:
            raw = await db.scalar(ST_AsGeoJSON(h.location))
            if raw:
                geojson = json.loads(raw)
        out.append(_hotspot_to_out(h, geojson))
    return out


@router.get("/{zone_id}", response_model=HotspotOut, summary="Get hotspot by zone ID (e.g. HS-01)")
async def get_hotspot(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    result = await db.execute(select(Hotspot).where(Hotspot.zone_id == zone_id))
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail=f"Hotspot '{zone_id}' not found")

    geojson = None
    if h.location is not None:
        raw = await db.scalar(ST_AsGeoJSON(h.location))
        if raw:
            geojson = json.loads(raw)

    return _hotspot_to_out(h, geojson)


@router.get("/{zone_id}/timeseries", response_model=ThermalTimeSeriesResponse)
async def get_timeseries(
    zone_id: str,
    days: int = Query(180, description="Number of days back to fetch"),
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    from datetime import datetime, timedelta
    result = await db.execute(select(Hotspot).where(Hotspot.zone_id == zone_id))
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail=f"Hotspot '{zone_id}' not found")

    since = datetime.utcnow() - timedelta(days=days)
    ts_result = await db.execute(
        select(LSTTimeSeries)
        .where(and_(LSTTimeSeries.hotspot_id == h.id, LSTTimeSeries.recorded_at >= since))
        .order_by(LSTTimeSeries.recorded_at)
    )
    ts_rows = ts_result.scalars().all()

    data = [LSTDataPoint(
        recorded_at=r.recorded_at,
        lst=float(r.lst),
        ndvi=float(r.ndvi) if r.ndvi else None,
        satellite=r.satellite,
    ) for r in ts_rows]

    # Calculate trend from first vs last 5 readings
    trend = "stable"
    if len(data) >= 10:
        first_avg = sum(d.lst for d in data[:5]) / 5
        last_avg  = sum(d.lst for d in data[-5:]) / 5
        delta = last_avg - first_avg
        trend = "rising" if delta > 0.5 else ("falling" if delta < -0.5 else "stable")

    change_30d = 0.0
    if len(data) >= 2:
        change_30d = round(data[-1].lst - data[0].lst, 2)

    # Get city name
    city_res = await db.execute(select(City).where(City.id == h.city_id))
    city = city_res.scalar_one_or_none()

    return ThermalTimeSeriesResponse(
        hotspot_id=h.id,
        zone_id=h.zone_id,
        city_name=city.name if city else "Unknown",
        data=data,
        trend=trend,
        change_30d=change_30d,
    )


@router.post("/", response_model=HotspotOut, status_code=201, summary="Create a new hotspot [Planner/Admin]")
async def create_hotspot(
    payload: HotspotCreate,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(require_planner),
):
    from geoalchemy2 import WKTElement
    existing = await db.execute(select(Hotspot).where(Hotspot.zone_id == payload.zone_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Zone ID '{payload.zone_id}' already exists")

    h = Hotspot(
        zone_id=payload.zone_id,
        city_id=payload.city_id,
        barangay_name=payload.barangay_name,
        district=payload.district,
        location=WKTElement(f"POINT({payload.lng} {payload.lat})", srid=4326),
        lst=payload.lst,
        ndvi=payload.ndvi,
        severity=payload.severity,
        cause=payload.cause,
        impervious_pct=payload.impervious_pct,
        satellite=payload.satellite,
        acquisition_date=payload.acquisition_date,
    )
    db.add(h)
    await db.commit()
    await db.refresh(h)
    return _hotspot_to_out(h)


@router.patch("/{zone_id}", response_model=HotspotOut, summary="Update hotspot fields [Planner/Admin]")
async def update_hotspot(
    zone_id: str,
    payload: HotspotUpdate,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(require_planner),
):
    result = await db.execute(select(Hotspot).where(Hotspot.zone_id == zone_id))
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Hotspot not found")

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(h, field, val)

    from datetime import datetime
    h.last_updated = datetime.utcnow()
    await db.commit()
    await db.refresh(h)
    return _hotspot_to_out(h)


@router.delete("/{zone_id}", status_code=204, summary="Deactivate a hotspot [Admin]")
async def deactivate_hotspot(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(require_planner),
):
    result = await db.execute(select(Hotspot).where(Hotspot.zone_id == zone_id))
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    h.is_active = False
    await db.commit()


@router.get("/spatial/nearby", response_model=List[HotspotOut], summary="Find hotspots within radius")
async def nearby_hotspots(
    lng:    float = Query(..., description="Longitude"),
    lat:    float = Query(..., description="Latitude"),
    radius_km: float = Query(5.0, description="Search radius in km"),
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    """PostGIS spatial query: find all hotspots within radius_km of a point."""
    radius_m = radius_km * 1000
    point = ST_SetSRID(ST_MakePoint(lng, lat), 4326)

    result = await db.execute(
        select(Hotspot).where(
            and_(
                ST_DWithin(Hotspot.location, point, radius_m),
                Hotspot.is_active == True,
            )
        ).order_by(Hotspot.lst.desc())
    )
    hotspots = result.scalars().all()

    out = []
    for h in hotspots:
        geojson = None
        if h.location is not None:
            raw = await db.scalar(ST_AsGeoJSON(h.location))
            if raw:
                geojson = json.loads(raw)
        out.append(_hotspot_to_out(h, geojson))
    return out
