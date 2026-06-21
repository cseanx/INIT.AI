"""
NDVI router — /ndvi
Vegetation index and canopy analysis endpoints.
"""
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.database import get_db
from models.orm import Profile, City, Barangay
from models.schemas import NDVISummary, NDVIZoneOut
from utils.auth import get_current_active_user
from utils.spatial import ndvi_classification, trees_to_target, cooling_potential
from services.gee_service import gee_service

router = APIRouter()

CANOPY_TARGETS = {
    "Quezon City": 30.0, "Manila": 25.0, "Makati": 25.0,
    "Cebu City": 30.0,   "Davao City": 35.0,
}


@router.get("/summary/{city_name}", response_model=NDVISummary)
async def ndvi_summary(
    city_name: str,
    date_from: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    # Get GEE NDVI data
    gee_data = await gee_service.get_ndvi_map(city_name, date_from)
    mean_ndvi = gee_data["stats"]["mean_ndvi"]

    # Get barangay breakdown from DB
    city_res = await db.execute(select(City).where(City.name == city_name))
    city = city_res.scalar_one_or_none()

    zones = []
    if city:
        bgy_res = await db.execute(
            select(Barangay).where(Barangay.city_id == city.id).limit(20)
        )
        barangays = bgy_res.scalars().all()
        for b in barangays:
            ndvi = float(b.ndvi) if b.ndvi else mean_ndvi
            zones.append(NDVIZoneOut(
                zone_name=b.name,
                ndvi=ndvi,
                classification=ndvi_classification(ndvi),
                canopy_pct=float(b.canopy_pct) if b.canopy_pct else round(ndvi * 40, 1),
            ))

    target = CANOPY_TARGETS.get(city_name, 30.0)
    canopy = gee_data["stats"].get("canopy_pct", round(mean_ndvi * 40, 1))
    gap = max(0, target - canopy)

    return NDVISummary(
        city_name=city_name,
        mean_ndvi=mean_ndvi,
        min_ndvi=gee_data["stats"].get("min_ndvi", -0.05),
        max_ndvi=gee_data["stats"].get("max_ndvi", 0.58),
        canopy_pct=canopy,
        canopy_target_pct=target,
        canopy_gap_pct=round(gap, 1),
        trees_required=trees_to_target(canopy, target),
        acquisition_date=date.fromisoformat(gee_data["acquisition_date"]),
        zones=zones,
    )


@router.get("/tile-url/{city_name}", summary="Get NDVI tile URL for map layer")
async def ndvi_tile(
    city_name: str,
    date_from: Optional[date] = Query(None),
    _: Profile = Depends(get_current_active_user),
):
    return await gee_service.get_ndvi_map(city_name, date_from)
