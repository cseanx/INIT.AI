"""
Alerts router — /alerts
Threshold breach monitoring and alert management.
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from models.database import get_db
from models.orm import Alert, City, Profile
from models.schemas import AlertOut, AlertCreate
from utils.auth import get_current_active_user, require_planner
from services.alert_engine import alert_engine

router = APIRouter()


@router.get("/", response_model=List[AlertOut], summary="List active alerts")
async def list_alerts(
    city_name: Optional[str] = Query(None),
    alert_type: Optional[str] = Query(None, description="emergency|warning|watch|info"),
    is_active: bool = Query(True),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    q = select(Alert).where(Alert.is_active == is_active)

    if city_name:
        city_res = await db.execute(select(City).where(City.name == city_name))
        city = city_res.scalar_one_or_none()
        if city:
            q = q.where(Alert.city_id == city.id)

    if alert_type:
        q = q.where(Alert.alert_type == alert_type)

    q = q.order_by(desc(Alert.created_at)).limit(limit)
    result = await db.execute(q)
    alerts = result.scalars().all()
    return [AlertOut.model_validate(a) for a in alerts]


@router.get("/stats/{city_name}", summary="Get alert counts by severity")
async def alert_stats(
    city_name: str,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    city_res = await db.execute(select(City).where(City.name == city_name))
    city = city_res.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    result = await db.execute(
        select(Alert).where(Alert.city_id == city.id, Alert.is_active == True)
    )
    alerts = result.scalars().all()

    counts = {"emergency": 0, "warning": 0, "watch": 0, "info": 0}
    for a in alerts:
        counts[a.alert_type] = counts.get(a.alert_type, 0) + 1

    return {
        "city_name": city_name,
        "total_active": len(alerts),
        "by_type": counts,
        "unread": sum(1 for a in alerts if not a.is_read),
    }


@router.post("/", response_model=AlertOut, status_code=201, summary="Manually create an alert [Planner/Admin]")
async def create_alert(
    payload: AlertCreate,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(require_planner),
):
    alert = Alert(
        city_id=payload.city_id,
        hotspot_id=payload.hotspot_id,
        alert_type=payload.alert_type,
        title=payload.title,
        body=payload.body,
        trigger_metric=payload.trigger_metric,
        trigger_value=payload.trigger_value,
        threshold_value=payload.threshold_value,
        channels_sent=["dashboard"],
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return AlertOut.model_validate(alert)


@router.post("/{alert_id}/acknowledge", response_model=AlertOut, summary="Acknowledge an alert")
async def acknowledge_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    from datetime import datetime
    alert.is_read = True
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.utcnow()
    await db.commit()
    await db.refresh(alert)
    return AlertOut.model_validate(alert)


@router.post("/scan/{city_name}", summary="Trigger threshold scan for a city [Planner/Admin]")
async def trigger_scan(
    city_name: str,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(require_planner),
):
    city_res = await db.execute(select(City).where(City.name == city_name))
    city = city_res.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    result = await alert_engine.run_city_scan(city.id, db)
    return result
