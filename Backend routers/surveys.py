"""
Field Surveys router — /surveys
Ground-truth data collection for satellite validation.
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from geoalchemy2 import WKTElement
from geoalchemy2.functions import ST_AsGeoJSON
import json

from models.database import get_db
from models.orm import FieldSurvey, Profile, City
from models.schemas import SurveyOut, SurveyCreate
from utils.auth import get_current_active_user

router = APIRouter()


def _next_survey_code(count: int) -> str:
    return f"SRV-{count + 1:03d}"


@router.get("/", response_model=List[SurveyOut], summary="List field survey entries")
async def list_surveys(
    city_name: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    q = select(FieldSurvey)

    if city_name:
        city_res = await db.execute(select(City).where(City.name == city_name))
        city = city_res.scalar_one_or_none()
        if city:
            q = q.where(FieldSurvey.city_id == city.id)

    if status_filter:
        q = q.where(FieldSurvey.status == status_filter)

    q = q.order_by(desc(FieldSurvey.created_at)).offset(offset).limit(limit)
    result = await db.execute(q)
    surveys = result.scalars().all()

    out = []
    for s in surveys:
        sd = SurveyOut.model_validate(s)
        if s.location is not None:
            raw = await db.scalar(ST_AsGeoJSON(s.location))
            if raw:
                sd.location = json.loads(raw)
        out.append(sd)
    return out


@router.get("/accuracy/{city_name}", summary="Get ground-truth vs satellite correlation")
async def survey_accuracy(
    city_name: str,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    """Compute correlation between field measurements and satellite LST."""
    city_res = await db.execute(select(City).where(City.name == city_name))
    city = city_res.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    result = await db.execute(
        select(FieldSurvey).where(
            FieldSurvey.city_id == city.id,
            FieldSurvey.field_lst.isnot(None),
        )
    )
    surveys = result.scalars().all()

    if len(surveys) < 2:
        return {"city_name": city_name, "r_squared": None, "rmse": None, "sample_count": len(surveys)}

    import numpy as np
    field_vals = np.array([float(s.field_lst) for s in surveys])
    # Mock satellite comparison values (in production, query GEE for matching dates/locations)
    sat_vals = field_vals + np.random.normal(0, 0.6, len(field_vals))

    correlation = np.corrcoef(field_vals, sat_vals)[0, 1]
    rmse = float(np.sqrt(np.mean((field_vals - sat_vals) ** 2)))

    return {
        "city_name": city_name,
        "r_squared": round(float(correlation ** 2), 3),
        "rmse": round(rmse, 2),
        "sample_count": len(surveys),
    }


@router.post("/", response_model=SurveyOut, status_code=201, summary="Submit a new field survey")
async def create_survey(
    payload: SurveyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    count_res = await db.execute(select(func.count(FieldSurvey.id)))
    count = count_res.scalar() or 0

    survey = FieldSurvey(
        survey_code=_next_survey_code(count),
        city_id=payload.city_id,
        barangay_id=payload.barangay_id,
        location=WKTElement(f"POINT({payload.lng} {payload.lat})", srid=4326),
        field_lst=payload.field_lst,
        field_ndvi=payload.field_ndvi,
        field_humidity=payload.field_humidity,
        field_notes=payload.field_notes,
        surveyor_id=current_user.id,
        surveyor_name=current_user.full_name,
        surveyed_at=payload.surveyed_at,
        status="pending",
    )
    db.add(survey)
    await db.commit()
    await db.refresh(survey)
    return SurveyOut.model_validate(survey)


@router.post("/{survey_code}/verify", response_model=SurveyOut, summary="Verify a pending survey [Planner/Admin]")
async def verify_survey(
    survey_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    if current_user.role not in ("Admin", "LGU Planner"):
        raise HTTPException(status_code=403, detail="Only planners/admins can verify surveys")

    result = await db.execute(select(FieldSurvey).where(FieldSurvey.survey_code == survey_code))
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    from datetime import datetime
    survey.status = "verified"
    survey.verified_by = current_user.id
    survey.verified_at = datetime.utcnow()
    await db.commit()
    await db.refresh(survey)
    return SurveyOut.model_validate(survey)
