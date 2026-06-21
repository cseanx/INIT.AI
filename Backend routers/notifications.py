"""
Notifications router — /notifications
Per-user notification feed and channel performance.
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update

from models.database import get_db
from models.orm import Notification, Profile
from models.schemas import NotificationOut
from utils.auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[NotificationOut], summary="Get my notifications")
async def list_notifications(
    notif_type: Optional[str] = Query(None, description="emergency|alert|info"),
    unread_only: bool = Query(False),
    limit: int = Query(30, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    q = select(Notification).where(Notification.user_id == current_user.id)

    if notif_type:
        q = q.where(Notification.notif_type == notif_type)
    if unread_only:
        q = q.where(Notification.is_read == False)

    q = q.order_by(desc(Notification.created_at)).limit(limit)
    result = await db.execute(q)
    notifs = result.scalars().all()
    return [NotificationOut.model_validate(n) for n in notifs]


@router.get("/unread-count", summary="Get count of unread notifications")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )
    count = len(result.scalars().all())
    return {"unread_count": count}


@router.post("/{notif_id}/read", summary="Mark a notification as read")
async def mark_read(
    notif_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_id, Notification.user_id == current_user.id
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    await db.commit()
    return {"status": "marked_read"}


@router.post("/mark-all-read", summary="Mark all notifications as read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "all_marked_read"}
