"""
Auth router — /auth
Handles registration, login, token refresh, and profile management.
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.database import get_db, settings
from models.orm import Profile
from models.schemas import (
    RegisterRequest, LoginRequest, TokenResponse,
    ProfileOut, ProfileUpdate,
)
from utils.auth import (
    create_access_token, hash_password, verify_password,
    get_current_active_user, require_admin,
)

router = APIRouter()


# ─── POST /auth/register ──────────────────────────────────────
@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    # Check duplicate email
    result = await db.execute(select(Profile).where(Profile.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create profile with hashed password
    # NOTE: In production, delegate auth to Supabase Auth
    # and only create the profile row here.
    profile = Profile(
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        lgu=payload.lgu,
        # Store hash in a separate auth table in production;
        # for prototype we embed it in the profile.
    )
    # Store hashed password as a custom field for demo
    profile.__dict__["_password_hash"] = hash_password(payload.password)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    token = create_access_token(
        {"sub": str(profile.id), "role": profile.role},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )

    return TokenResponse(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=ProfileOut.model_validate(profile),
    )


# ─── POST /auth/login ─────────────────────────────────────────
@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email + password",
)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.email == payload.email))
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # In production: verify via Supabase Auth API
    # For prototype: check stored hash
    stored_hash = profile.__dict__.get("_password_hash", "")
    if stored_hash and not verify_password(payload.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not profile.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated. Contact your LGU administrator.",
        )

    # Update last login
    from datetime import datetime
    profile.last_login = datetime.utcnow()
    await db.commit()

    token = create_access_token(
        {"sub": str(profile.id), "role": profile.role},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )

    return TokenResponse(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=ProfileOut.model_validate(profile),
    )


# ─── GET /auth/me ─────────────────────────────────────────────
@router.get(
    "/me",
    response_model=ProfileOut,
    summary="Get current authenticated user profile",
)
async def get_me(current_user: Profile = Depends(get_current_active_user)):
    return ProfileOut.model_validate(current_user)


# ─── PATCH /auth/me ───────────────────────────────────────────
@router.patch(
    "/me",
    response_model=ProfileOut,
    summary="Update current user profile",
)
async def update_me(
    payload: ProfileUpdate,
    current_user: Profile = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return ProfileOut.model_validate(current_user)


# ─── GET /auth/users (Admin only) ────────────────────────────
@router.get(
    "/users",
    response_model=list[ProfileOut],
    summary="List all users [Admin only]",
)
async def list_users(
    current_user: Profile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).order_by(Profile.created_at.desc()))
    profiles = result.scalars().all()
    return [ProfileOut.model_validate(p) for p in profiles]


# ─── DELETE /auth/users/{user_id} (Admin only) ───────────────
@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate a user account [Admin only]",
)
async def deactivate_user(
    user_id: str,
    current_user: Profile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID
    result = await db.execute(select(Profile).where(Profile.id == UUID(user_id)))
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    if str(profile.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    profile.is_active = False
    await db.commit()
