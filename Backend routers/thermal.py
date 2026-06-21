"""
Thermal router — /thermal
Land Surface Temperature data and summary endpoints.
"""
from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.orm import Profile, City
from models.schemas import ThermalSummary
from utils.auth import get_current_active_user
from services.gee_service import gee_service

router = APIRouter()


@router.get("/summary/{city_name}", summary="Get thermal summary for a city")
async def thermal_summary(
    city_name: str,
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    _: Profile = Depends(get_current_active_user),
):
    """Fetch LST data from GEE (or cached mock) for the city."""
    result = await gee_service.get_lst_map(city_name, date_from, date_to)
    return result


@router.get("/uhi/{city_name}", summary="Get UHI intensity for a city")
async def uhi_intensity(
    city_name: str,
    acq_date: Optional[date] = Query(None),
    _: Profile = Depends(get_current_active_user),
):
    result = await gee_service.get_uhi_intensity(city_name, acq_date)
    return result


@router.get("/lst-map/{city_name}", summary="Get LST tile URL for map rendering")
async def lst_map_tiles(
    city_name: str,
    layer: str = Query("thermal", description="thermal|ndvi|uhi"),
    date_from: Optional[date] = Query(None),
    _: Profile = Depends(get_current_active_user),
):
    if layer == "ndvi":
        return await gee_service.get_ndvi_map(city_name, date_from)
    elif layer == "uhi":
        return await gee_service.get_uhi_intensity(city_name, date_from)
    else:
        return await gee_service.get_lst_map(city_name, date_from)
