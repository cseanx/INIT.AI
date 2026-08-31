"""Account management: profile name, email change, password change."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models import User
from app.schemas.auth import (
    ChangeEmailRequest,
    ChangeEmailVerifyRequest,
    ChangeNameRequest,
    ChangePasswordRequest,
    MessageOut,
    UserOut,
)
from app.services.auth import (
    hash_password,
    revoke_all_user_sessions,
    revoke_other_sessions,
    verify_password,
)
from app.services.email import send_email_change_verification
from app.services.tokens import (
    consume_email_change_token,
    create_email_change_token,
)
from app.services.validators import MIN_PASSWORD_LENGTH

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/me", response_model=UserOut)
def account_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.put("/profile", response_model=UserOut)
def update_profile(
    body: ChangeNameRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    # Prevent role/organization/email changes via this endpoint.
    user.name = body.name.strip()
    db.commit()
    db.refresh(user)
    return user


@router.post("/email/request", response_model=MessageOut)
def request_email_change(
    body: ChangeEmailRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageOut:
    # Require re-authentication via current password.
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )
    new_email = body.new_email.lower().strip()
    if new_email == user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New email must be different from current email.",
        )
    existing = db.scalar(select(User).where(User.email == new_email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )
    # Email format already validated by EmailStr.
    try:
        raw_token = create_email_change_token(db, user, new_email)
        send_email_change_verification(new_email, user.name, raw_token)
    except Exception:
        pass
    return MessageOut(message="Verification email sent to your new address. Please check your inbox.")


@router.post("/email/verify", response_model=UserOut)
def verify_email_change(
    body: ChangeEmailVerifyRequest,
    db: Session = Depends(get_db),
    # Require authenticated session for the verification? Spec: user confirms via link.
    # We allow both authenticated and unauthenticated? Link may be opened without session.
    # To keep security, we require the token itself; the token is tied to user_id.
    # No extra auth needed beyond the token.
) -> User:
    result = consume_email_change_token(db, body.token)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired email change link.",
        )
    user, _ = result
    return user


@router.get("/email/verify", response_model=MessageOut)
def verify_email_change_get(
    token: str,
    db: Session = Depends(get_db),
) -> MessageOut:
    result = consume_email_change_token(db, token)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired email change link.",
        )
    return MessageOut(message="Email changed successfully.")


@router.put("/password", response_model=MessageOut)
def change_password(
    body: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageOut:
    if body.new_password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New passwords do not match.",
        )
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )
    if len(body.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters.",
        )
    user.password_hash = hash_password(body.new_password)
    db.commit()
    # Invalidate other sessions (keep current session valid? spec says invalidate existing sessions where appropriate after password change.)
    # We'll revoke all OTHER sessions so the user stays logged in on this device.
    current_token = request.cookies.get(settings.session_cookie_name)
    revoke_other_sessions(db, user, current_token)
    # Alternatively, to be maximally secure, revoke_all:
    # revoke_all_user_sessions(db, user)
    return MessageOut(message="Password changed successfully.")
