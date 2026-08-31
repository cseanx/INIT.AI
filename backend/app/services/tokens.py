"""Token helpers for email verification, password reset, and email change."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DBSession

from app.core.config import settings
from app.models import User
from app.models.email_change_token import EmailChangeToken
from app.models.password_reset_token import PasswordResetToken
from app.models.verification_token import VerificationToken


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Generic token creation
# ---------------------------------------------------------------------------

def create_verification_token(db: DBSession, user: User) -> str:
    raw = secrets.token_urlsafe(32)
    expires_at = _now() + timedelta(hours=settings.email_verification_ttl_hours)
    db.add(
        VerificationToken(
            user_id=user.id,
            token_hash=_hash_token(raw),
            expires_at=expires_at,
        )
    )
    db.commit()
    return raw


def create_password_reset_token(db: DBSession, user: User) -> str:
    raw = secrets.token_urlsafe(32)
    expires_at = _now() + timedelta(hours=settings.password_reset_ttl_hours)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_token(raw),
            expires_at=expires_at,
        )
    )
    db.commit()
    return raw


def create_email_change_token(db: DBSession, user: User, new_email: str) -> str:
    raw = secrets.token_urlsafe(32)
    expires_at = _now() + timedelta(hours=settings.email_change_ttl_hours)
    db.add(
        EmailChangeToken(
            user_id=user.id,
            token_hash=_hash_token(raw),
            new_email=new_email.lower(),
            expires_at=expires_at,
        )
    )
    db.commit()
    return raw


# ---------------------------------------------------------------------------
# Token consumption / validation
# ---------------------------------------------------------------------------

def _is_expired(expires_at: datetime) -> bool:
    now = _now()
    # Ensure timezone aware comparison
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < now


def consume_verification_token(db: DBSession, raw_token: str) -> User | None:
    h = _hash_token(raw_token)
    tok = db.scalar(select(VerificationToken).where(VerificationToken.token_hash == h))
    if tok is None:
        return None
    if tok.used_at is not None:
        return None
    if _is_expired(tok.expires_at):
        return None
    # Load user
    user = db.get(User, tok.user_id)
    if user is None:
        return None
    tok.used_at = _now()
    user.email_verified = True
    db.commit()
    return user


def consume_password_reset_token(db: DBSession, raw_token: str) -> User | None:
    h = _hash_token(raw_token)
    tok = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == h))
    if tok is None:
        return None
    if tok.used_at is not None:
        return None
    if _is_expired(tok.expires_at):
        return None
    user = db.get(User, tok.user_id)
    if user is None:
        return None
    # Mark used but don't commit yet — caller will update password and commit.
    # We set used_at now to prevent race; if password update fails, token is still consumed (single-use).
    tok.used_at = _now()
    db.flush()
    return user


def consume_email_change_token(db: DBSession, raw_token: str) -> tuple[User, str] | None:
    h = _hash_token(raw_token)
    tok = db.scalar(select(EmailChangeToken).where(EmailChangeToken.token_hash == h))
    if tok is None:
        return None
    if tok.used_at is not None:
        return None
    if _is_expired(tok.expires_at):
        return None
    user = db.get(User, tok.user_id)
    if user is None:
        return None
    # Check new_email not already taken (race)
    existing = db.scalar(select(User).where(User.email == tok.new_email))
    if existing is not None and existing.id != user.id:
        # Invalidate token and abort
        tok.used_at = _now()
        db.commit()
        return None
    new_email = tok.new_email
    tok.used_at = _now()
    user.email = new_email
    # Changing email re-verifies via this token flow; the new address is considered verified
    # only via the confirmation link. Keep email_verified True if it was True before.
    # If the user's old email was unverified, this confirmation also verifies the account.
    user.email_verified = True
    db.commit()
    return user, new_email


def delete_expired_tokens(db: DBSession) -> None:
    now = _now()
    # Optional cleanup — called opportunistically
    db.execute(delete(VerificationToken).where(VerificationToken.expires_at < now, VerificationToken.used_at.is_not(None)))
    db.execute(delete(PasswordResetToken).where(PasswordResetToken.expires_at < now, PasswordResetToken.used_at.is_not(None)))
    db.execute(delete(EmailChangeToken).where(EmailChangeToken.expires_at < now, EmailChangeToken.used_at.is_not(None)))
    db.commit()
