from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User, UserPreference
from app.schemas.preference import UserPreferenceOut, UserPreferenceUpdate

router = APIRouter(prefix="/preferences", tags=["preferences"])


def _get_or_create(db: Session, user: User) -> UserPreference:
    pref = db.scalar(
        select(UserPreference).where(UserPreference.user_id == user.id)
    )
    if pref is None:
        pref = UserPreference(user_id=user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


@router.get("", response_model=UserPreferenceOut)
def get_preferences(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserPreference:
    return _get_or_create(db, user)


@router.put("", response_model=UserPreferenceOut)
def update_preferences(
    body: UserPreferenceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserPreference:
    pref = _get_or_create(db, user)
    if body.theme is not None:
        pref.theme = body.theme
    if body.sidebar_collapsed is not None:
        pref.sidebar_collapsed = body.sidebar_collapsed
    db.commit()
    db.refresh(pref)
    return pref
