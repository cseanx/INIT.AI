"""
Forecast router — /forecast
AI-powered LST prediction using Prophet + El Niño adjustments.
"""
from typing import Optional, List
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from models.database import get_db
from models.orm import Profile, Hotspot, LSTTimeSeries, City
from models.schemas import ForecastResponse, InterventionForecast
from utils.auth import get_current_active_user
from services.forecast_model import forecast_service

router = APIRouter()


@router.get("/city/{city_name}", response_model=ForecastResponse)
async def forecast_city(
    city_name:    str,
    horizon_days: int  = Query(7,    description="Forecast horizon: 7, 14, 30, or 90"),
    el_nino:      bool = Query(True, description="Apply El Niño warming bias"),
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    """Generate LST temperature forecast for a city."""
    # Fetch historical timeseries from the most critical hotspot
    city_res = await db.execute(select(City).where(City.name == city_name))
    city = city_res.scalar_one_or_none()

    historical = []
    if city:
        ts_res = await db.execute(
            select(LSTTimeSeries)
            .where(LSTTimeSeries.city_id == city.id)
            .order_by(LSTTimeSeries.recorded_at)
            .limit(200)
        )
        rows = ts_res.scalars().all()
        historical = [{"date": r.recorded_at.date(), "lst": float(r.lst)} for r in rows]

    result = forecast_service.forecast(
        city_name=city_name,
        historical_data=historical if historical else None,
        horizon_days=horizon_days,
        el_nino_active=el_nino,
    )

    # Convert to response model
    from models.schemas import ForecastPoint
    points = [ForecastPoint(**p) for p in result["data"]]

    return ForecastResponse(
        city_name=result["city_name"],
        horizon_days=result["horizon_days"],
        model=result["model"],
        accuracy_pct=result["accuracy_pct"],
        el_nino_factor=result["el_nino_factor"],
        data=points,
        peak_date=result["peak_date"],
        peak_lst=result["peak_lst"],
        trend=result["trend"],
    )


@router.get("/intervention-comparison/{city_name}")
async def intervention_comparison(
    city_name: str,
    horizon_days: int   = Query(30),
    cooling_c:    float = Query(3.2, description="Combined cooling from interventions (°C)"),
    _: Profile = Depends(get_current_active_user),
):
    """Compare Business-As-Usual vs with-interventions temperature trajectory."""
    comparison = forecast_service.intervention_comparison(
        city_name=city_name,
        horizon_days=horizon_days,
        cooling_interventions_c=cooling_c,
    )
    return {
        "city_name": city_name,
        "horizon_days": horizon_days,
        "cooling_interventions_c": cooling_c,
        "data": comparison,
    }
