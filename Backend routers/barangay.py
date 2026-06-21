"""
Barangay router — /barangays
Drill-down spatial analysis at barangay level.
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.functions import ST_AsGeoJSON
import json

from models.database import get_db
from models.orm import Profile, Barangay, City
from models.schemas import BarangayOut
from utils.auth import get_current_active_user
from utils.spatial import point_to_geojson

router = APIRouter()


@router.get("/", response_model=List[BarangayOut])
async def list_barangays(
    city_name:  Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    limit:      int           = Query(50, le=200),
    offset:     int           = Query(0),
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    q = select(Barangay)

    if city_name:
        city_res = await db.execute(select(City).where(City.name == city_name))
        city = city_res.scalar_one_or_none()
        if city:
            q = q.where(Barangay.city_id == city.id)

    if risk_level:
        q = q.where(Barangay.risk_level == risk_level)

    q = q.order_by(Barangay.lst.desc().nullslast()).offset(offset).limit(limit)
    result = await db.execute(q)
    barangays = result.scalars().all()

    out = []
    for b in barangays:
        bd = BarangayOut.model_validate(b)
        if b.location is not None:
            raw = await db.scalar(ST_AsGeoJSON(b.location))
            if raw:
                bd.location = json.loads(raw)
        out.append(bd)
    return out


@router.get("/{code}", response_model=BarangayOut)
async def get_barangay(
    code: str,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    result = await db.execute(select(Barangay).where(Barangay.code == code))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail=f"Barangay '{code}' not found")

    bd = BarangayOut.model_validate(b)
    if b.location is not None:
        raw = await db.scalar(ST_AsGeoJSON(b.location))
        if raw:
            bd.location = json.loads(raw)
    return bd
