"""
Satellite router — /satellite
Image archive browsing and tile layer endpoints.
"""
from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from models.database import get_db
from models.orm import SatelliteScene, City, Profile
from models.schemas import SatelliteSceneOut
from utils.auth import get_current_active_user
from services.gee_service import gee_service

router = APIRouter()


@router.get("/scenes/{city_name}", response_model=List[SatelliteSceneOut], summary="List archived scenes")
async def list_scenes(
    city_name: str,
    satellite: Optional[str] = Query(None),
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    city_res = await db.execute(select(City).where(City.name == city_name))
    city = city_res.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    q = select(SatelliteScene).where(SatelliteScene.city_id == city.id)
    if satellite:
        q = q.where(SatelliteScene.satellite == satellite)
    q = q.order_by(desc(SatelliteScene.acquisition_date)).limit(limit)

    result = await db.execute(q)
    scenes = result.scalars().all()

    if not scenes:
        # Return mock archive for demo
        return _mock_scenes(city.id, city_name)

    return [SatelliteSceneOut.model_validate(s) for s in scenes]


@router.get("/layer/{city_name}", summary="Get live tile URL for thermal/NDVI/UHI layer")
async def get_layer(
    city_name: str,
    layer: str = Query("thermal", description="thermal|ndvi|uhi|rgb"),
    acquisition_date: Optional[date] = Query(None),
    _: Profile = Depends(get_current_active_user),
):
    if layer == "ndvi":
        return await gee_service.get_ndvi_map(city_name, acquisition_date)
    elif layer == "uhi":
        return await gee_service.get_uhi_intensity(city_name, acquisition_date)
    else:
        return await gee_service.get_lst_map(city_name, acquisition_date)


@router.get("/metadata/{city_name}", summary="Get scene metadata (sun angle, projection, etc.)")
async def scene_metadata(
    city_name: str,
    _: Profile = Depends(get_current_active_user),
):
    return {
        "city_name": city_name,
        "scene_id": "LC09_L2SP_116050_20250526",
        "path_row": "116/050",
        "sun_elevation": 68.4,
        "sun_azimuth": 103.2,
        "pixel_size": "30m OLI / 1km SLSTR",
        "datum": "WGS84",
        "projection": "UTM Zone 51N",
        "processing_level": "Level-2 Surface Reflectance + LST",
    }


def _mock_scenes(city_id, city_name: str) -> List[dict]:
    dates = ["2025-05-26", "2025-04-10", "2025-03-04", "2025-01-20", "2024-12-08", "2024-10-31"]
    sats = ["Landsat-9", "MODIS", "Sentinel-3", "Sentinel-3", "Landsat-9", "MODIS"]
    out = []
    for i, (d, sat) in enumerate(zip(dates, sats)):
        out.append({
            "id": f"mock-{i}",
            "city_id": str(city_id),
            "scene_id": f"SCENE_{d.replace('-','')}",
            "satellite": sat,
            "acquisition_date": d,
            "cloud_cover": 3.0 + i * 0.5,
            "status": "ready",
            "lst_tile_url": None,
            "ndvi_tile_url": None,
            "rgb_tile_url": None,
            "mean_lst": 38.2 + (i * 0.3),
            "mean_ndvi": 0.22 - (i * 0.005),
            "processed_at": d,
        })
    return out
