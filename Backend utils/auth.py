"""
Authentication utilities:
- JWT creation and verification
- Supabase session validation
- Role-based access control dependencies
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.database import settings, get_db
from models.orm import Profile

logger = logging.getLogger(__name__)
security = HTTPBearer()


# ─── JWT Helpers ──────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            options={"verify_exp": True},
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── Auth Dependencies ────────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Profile:
    """Extract and validate the current user from the JWT bearer token."""
    token = credentials.credentials
    payload = decode_token(token)

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject (sub) claim",
        )

    result = await db.execute(select(Profile).where(Profile.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user


async def get_current_active_user(
    current_user: Profile = Depends(get_current_user),
) -> Profile:
    return current_user


# ─── Role Guards ──────────────────────────────────────────────
def require_role(*roles: str):
    """Factory for role-based access control dependencies."""
    async def _check_role(
        current_user: Profile = Depends(get_current_active_user),
    ) -> Profile:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(roles)}. "
                       f"Your role: {current_user.role}",
            )
        return current_user
    return _check_role


# Convenience role dependencies
require_admin         = require_role("Admin")
require_planner       = require_role("Admin", "LGU Planner")
require_any_role      = require_role("Admin", "LGU Planner", "Research Viewer")


# ─── Password Hashing ─────────────────────────────────────────
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
