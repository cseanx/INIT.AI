from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import City
from app.schemas.city import CityOut
from app.services.readings import fetch_all

router = APIRouter(prefix="/cities", tags=["cities"])


@router.get("", response_model=list[CityOut])
def list_cities(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[City]:
    return fetch_all(db, select(City).order_by(City.name), limit)