"""
LGU Actions router — /actions
Green infrastructure project tracker with budget/progress management.
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from models.database import get_db
from models.orm import LGUAction, Profile, City
from models.schemas import ActionOut, ActionCreate, ActionUpdate
from utils.auth import get_current_active_user, require_planner

router = APIRouter()


def _next_action_code(count: int) -> str:
    return f"ACT-{count + 1:03d}"


@router.get("/", response_model=List[ActionOut], summary="List all LGU actions with filters")
async def list_actions(
    city_name: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    q = select(LGUAction)

    if city_name:
        city_res = await db.execute(select(City).where(City.name == city_name))
        city = city_res.scalar_one_or_none()
        if city:
            q = q.where(LGUAction.city_id == city.id)

    if status_filter and status_filter != "all":
        q = q.where(LGUAction.status == status_filter)
    if priority:
        q = q.where(LGUAction.priority == priority)

    q = q.order_by(desc(LGUAction.created_at)).offset(offset).limit(limit)
    result = await db.execute(q)
    actions = result.scalars().all()
    return [ActionOut.model_validate(a) for a in actions]


@router.get("/stats/{city_name}", summary="Get aggregate budget/status stats for a city")
async def action_stats(
    city_name: str,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    city_res = await db.execute(select(City).where(City.name == city_name))
    city = city_res.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    result = await db.execute(select(LGUAction).where(LGUAction.city_id == city.id))
    actions = result.scalars().all()

    status_counts = {}
    total_budget = 0.0
    total_spent = 0.0
    total_trees = 0

    for a in actions:
        status_counts[a.status] = status_counts.get(a.status, 0) + 1
        total_budget += float(a.budget_php or 0)
        total_spent += float(a.spent_php or 0)
        total_trees += a.trees_planted or 0

    return {
        "city_name": city_name,
        "total_actions": len(actions),
        "status_breakdown": status_counts,
        "total_budget_php": total_budget,
        "total_spent_php": total_spent,
        "budget_utilization_pct": round(total_spent / total_budget * 100, 1) if total_budget > 0 else 0,
        "total_trees_planted": total_trees,
        "in_progress": status_counts.get("in-progress", 0),
        "completed": status_counts.get("completed", 0),
    }


@router.get("/{action_code}", response_model=ActionOut)
async def get_action(
    action_code: str,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(get_current_active_user),
):
    result = await db.execute(select(LGUAction).where(LGUAction.action_code == action_code))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Action not found")
    return ActionOut.model_validate(a)


@router.post("/", response_model=ActionOut, status_code=201, summary="Create new LGU action [Planner/Admin]")
async def create_action(
    payload: ActionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_planner),
):
    count_res = await db.execute(select(func.count(LGUAction.id)))
    count = count_res.scalar() or 0

    action = LGUAction(
        action_code=_next_action_code(count),
        title=payload.title,
        description=payload.description,
        city_id=payload.city_id,
        barangay_id=payload.barangay_id,
        hotspot_id=payload.hotspot_id,
        priority=payload.priority,
        intervention_type=payload.intervention_type,
        budget_php=payload.budget_php,
        funding_source=payload.funding_source,
        est_cooling_c=payload.est_cooling_c,
        start_date=payload.start_date,
        due_date=payload.due_date,
        owner_agency=payload.owner_agency,
        created_by=current_user.id,
        status="planning",
    )
    db.add(action)
    await db.commit()
    await db.refresh(action)
    return ActionOut.model_validate(action)


@router.patch("/{action_code}", response_model=ActionOut, summary="Update action progress/status [Planner/Admin]")
async def update_action(
    action_code: str,
    payload: ActionUpdate,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(require_planner),
):
    result = await db.execute(select(LGUAction).where(LGUAction.action_code == action_code))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    update_data = payload.model_dump(exclude_none=True)
    for field, val in update_data.items():
        setattr(action, field, val)

    # Auto-complete when progress hits 100%
    if action.progress_pct == 100 and action.status != "completed":
        from datetime import date as date_cls
        action.status = "completed"
        action.completed_date = date_cls.today()

    from datetime import datetime
    action.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(action)
    return ActionOut.model_validate(action)


@router.delete("/{action_code}", status_code=204, summary="Cancel an action [Admin]")
async def cancel_action(
    action_code: str,
    db: AsyncSession = Depends(get_db),
    _: Profile = Depends(require_planner),
):
    result = await db.execute(select(LGUAction).where(LGUAction.action_code == action_code))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    action.status = "cancelled"
    await db.commit()
