from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Barangay, Report, User
from app.schemas.report import ReportCreate, ReportOut, ReportUpdate
from app.services.readings import fetch_all

router = APIRouter(prefix="/reports", tags=["reports"])


def _get_report(db: Session, report_id: int) -> Report:
    report = db.scalar(
        select(Report).options(joinedload(Report.barangay)).where(Report.id == report_id)
    )
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("", response_model=list[ReportOut])
def list_reports(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[Report]:
    statement = select(Report).options(
        joinedload(Report.barangay)
    ).order_by(Report.created_at.desc())
    return fetch_all(db, statement, limit)


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)) -> Report:
    return _get_report(db, report_id)


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    body: ReportCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> Report:
    data = body.model_dump(exclude={"area"})
    report = Report(**data)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.put("/{report_id}", response_model=ReportOut)
def update_report(
    report_id: int,
    body: ReportUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> Report:
    report = _get_report(db, report_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(report, field, value)
    db.commit()
    db.refresh(report)
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> None:
    report = _get_report(db, report_id)
    db.delete(report)
    db.commit()