from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models import User
from app.schemas.auth import LoginRequest, UserOut
from app.services.auth import (
    create_session,
    revoke_expired_sessions,
    revoke_session,
    verify_password,
)
from app.services.login_guard import LoginGuard

router = APIRouter(prefix="/auth", tags=["auth"])

_login_guard = LoginGuard(
    max_attempts=settings.login_max_attempts,
    window=settings.login_window_seconds,
    lockout=settings.login_lockout_seconds,
)


def _client_key(request: Request, email: str) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client = forwarded.split(",")[0].strip()
    else:
        client = request.client.host if request.client else "unknown"
    return f"{client}|{email}"


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        httponly=True,
        samesite=settings.session_cookie_samesite,
        secure=settings.session_cookie_secure,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        httponly=True,
        samesite=settings.session_cookie_samesite,
        secure=settings.session_cookie_secure,
        path="/",
    )


@router.post("/login", response_model=UserOut)
def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    email = body.email.lower()
    key = _client_key(request, email)

    allowed, retry_after, remaining = _login_guard.check(db, key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Too many failed attempts. "
                f"Try again in {retry_after} seconds."
            ),
            headers={"Retry-After": str(retry_after)},
        )

    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(body.password, user.password_hash):
        _login_guard.record_failure(db, key)
        attempts_left = max(remaining - 1, 0)
        detail = f"Invalid email or password. {attempts_left} attempt(s) remaining before lockout."
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        )

    _login_guard.record_success(db, key)
    revoke_expired_sessions(db, user)
    token = create_session(db, user)
    _set_session_cookie(response, token)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> None:
    revoke_session(db, request.cookies.get(settings.session_cookie_name))
    _clear_session_cookie(response)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
