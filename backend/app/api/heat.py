from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import Barangay, HeatData
from app.schemas.heat import HeatReadingOut
from app.services.readings import fetch_readings

router = APIRouter(prefix="/heat", tags=["heat"])


@router.get("", response_model=list[HeatReadingOut])
def list_heat(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[HeatData]:
    statement = select(HeatData).options(joinedload(HeatData.barangay))
    return fetch_readings(db, statement, HeatData.recorded_at, limit)
