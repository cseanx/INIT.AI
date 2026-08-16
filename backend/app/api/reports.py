from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import Barangay, Report
from app.schemas.report import ReportOut
from app.services.readings import fetch_all

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=list[ReportOut])
def list_reports(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[Report]:
    statement = select(Report).options(
        joinedload(Report.barangay)
    ).order_by(Report.created_at.desc())
    return fetch_all(db, statement, limit)
