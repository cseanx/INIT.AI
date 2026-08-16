"""Password hashing (Argon2id) and session token management."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DBSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.models import User, UserSession

_password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except Argon2Error:
        return False


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(db: DBSession, user: User) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.session_ttl_days)
    db.add(UserSession(user_id=user.id, token_hash=_hash_token(token), expires_at=expires_at))
    db.commit()
    return token


def get_session_user(db: DBSession, token: str | None) -> User | None:
    if not token:
        return None
    session = db.scalar(
        select(UserSession)
        .options(joinedload(UserSession.user))
        .where(UserSession.token_hash == _hash_token(token))
    )
    if session is None or session.expires_at < datetime.now(timezone.utc):
        return None
    return session.user


def revoke_session(db: DBSession, token: str | None) -> None:
    if not token:
        return
    db.execute(
        delete(UserSession).where(UserSession.token_hash == _hash_token(token))
    )
    db.commit()


def revoke_expired_sessions(db: DBSession, user: User) -> None:
    db.execute(
        delete(UserSession).where(
            UserSession.user_id == user.id,
            UserSession.expires_at < datetime.now(timezone.utc),
        )
    )
    db.commit()
