from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageOut,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    UserOut,
    VerifyEmailRequest,
)
from app.services.auth import (
    create_session,
    hash_password,
    revoke_all_user_sessions,
    revoke_expired_sessions,
    revoke_session,
    verify_password,
)
from app.services.email import (
    send_password_reset_email,
    send_verification_email,
)
from app.services.login_guard import LoginGuard
from app.services.tokens import (
    consume_password_reset_token,
    consume_verification_token,
    create_password_reset_token,
    create_verification_token,
)
from app.services.validators import normalize_role

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


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest,
    db: Session = Depends(get_db),
) -> User:
    if body.password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Passwords do not match.",
        )
    email = body.email.lower().strip()
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )
    role = normalize_role(body.role)
    user = User(
        name=body.name.strip(),
        email=email,
        password_hash=hash_password(body.password),
        role=role,
        organization=body.organization.strip(),
        email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate verification token and send email (dev-safe: logs to console).
    try:
        raw_token = create_verification_token(db, user)
        send_verification_email(user.email, user.name, raw_token)
    except Exception:
        # Registration succeeds even if email delivery fails; log but don't leak.
        pass
    return user


@router.post("/verify-email", response_model=MessageOut)
def verify_email(
    body: VerifyEmailRequest,
    db: Session = Depends(get_db),
) -> MessageOut:
    user = consume_verification_token(db, body.token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link.",
        )
    return MessageOut(message="Email verified successfully. You can now log in.")


@router.get("/verify-email", response_model=MessageOut)
def verify_email_get(
    token: str,
    db: Session = Depends(get_db),
) -> MessageOut:
    user = consume_verification_token(db, token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link.",
        )
    return MessageOut(message="Email verified successfully. You can now log in.")


@router.post("/resend-verification", response_model=MessageOut)
def resend_verification(
    body: ResendVerificationRequest,
    db: Session = Depends(get_db),
) -> MessageOut:
    # Generic response to avoid enumeration.
    generic = MessageOut(
        message="If an account with that email exists and is not yet verified, a new verification email has been sent."
    )
    email = body.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or user.email_verified:
        return generic
    try:
        raw_token = create_verification_token(db, user)
        send_verification_email(user.email, user.name, raw_token)
    except Exception:
        pass
    return generic


@router.post("/forgot-password", response_model=MessageOut)
def forgot_password(
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageOut:
    generic = MessageOut(
        message="If an account with that email exists, a password reset link has been sent."
    )
    email = body.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        return generic
    try:
        raw_token = create_password_reset_token(db, user)
        send_password_reset_email(user.email, user.name, raw_token)
    except Exception:
        pass
    return generic


@router.post("/reset-password", response_model=MessageOut)
def reset_password(
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageOut:
    if body.new_password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Passwords do not match.",
        )
    user = consume_password_reset_token(db, body.token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link.",
        )
    # Token is already marked used via consume; now update password.
    user.password_hash = hash_password(body.new_password)
    db.commit()
    # Invalidate all existing sessions for security.
    revoke_all_user_sessions(db, user)
    return MessageOut(message="Password has been reset. You can now log in.")


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

    # Require verified email before issuing a session — bypass for demo/testing accounts.
    bypass = {e.strip().lower() for e in settings.demo_bypass_emails.split(",") if e.strip()}
    if not user.email_verified and email not in bypass:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check your inbox for the verification link.",
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
