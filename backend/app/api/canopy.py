from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import Barangay, CanopyData
from app.schemas.canopy import CanopyReadingOut
from app.services.readings import fetch_readings

router = APIRouter(prefix="/canopy", tags=["canopy"])


@router.get("", response_model=list[CanopyReadingOut])
def list_canopy(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[CanopyData]:
    statement = select(CanopyData).options(joinedload(CanopyData.barangay))
    return fetch_readings(db, statement, CanopyData.recorded_at, limit)
