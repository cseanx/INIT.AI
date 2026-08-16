from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import Barangay, MitigationProject
from app.schemas.mitigation import MitigationProjectOut
from app.services.readings import fetch_all

router = APIRouter(prefix="/mitigation", tags=["mitigation"])


@router.get("", response_model=list[MitigationProjectOut])
def list_mitigation_projects(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[MitigationProject]:
    statement = select(MitigationProject).options(
        joinedload(MitigationProject.barangay)
    ).order_by(MitigationProject.created_at.desc())
    return fetch_all(db, statement, limit)
