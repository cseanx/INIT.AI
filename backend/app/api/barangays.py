from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import Barangay
from app.schemas.barangay import BarangayOut
from app.services.readings import fetch_all

router = APIRouter(prefix="/barangays", tags=["barangays"])


@router.get("", response_model=list[BarangayOut])
def list_barangays(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[Barangay]:
    statement = select(Barangay).options(joinedload(Barangay.city)).order_by(Barangay.name)
    return fetch_all(db, statement, limit)
