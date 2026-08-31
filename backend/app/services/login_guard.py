"""Database-backed login attempt guard.

Tracks failed login attempts per client key (IP + email) in Postgres, so
the lockout persists across serverless instance recycling. Failed attempts
are bounded by a sliding window; once the lockout expires the counter is
reset, giving the client a fresh set of attempts.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DBSession

from app.models import LoginAttempt


def _ensure_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class LoginGuard:
    def __init__(self, max_attempts: int = 5, window: float = 900, lockout: float = 30) -> None:
        self._max_attempts = max_attempts
        self._window = window
        self._lockout = lockout

    def check(self, db: DBSession, key: str) -> tuple[bool, int, int]:
        """Return (allowed, retry_after_seconds, attempts_remaining).

        When locked out the caller should reject the request before doing
        any password work. On expiry the counter is reset so the client
        gets a fresh set of attempts.
        """
        now = datetime.now(timezone.utc)
        attempt = db.scalar(select(LoginAttempt).where(LoginAttempt.key == key))
        if attempt is None:
            return True, 0, self._max_attempts

        locked = _ensure_aware(attempt.locked_until)
        if locked and locked > now:
            remaining = int((locked - now).total_seconds()) + 1
            return False, max(remaining, 1), 0

        # Lockout expired -> the client gets a fresh set of attempts.
        if attempt.failed_count >= self._max_attempts:
            attempt.failed_count = 0
            attempt.locked_until = None
            attempt.last_failure_at = None
            db.commit()
            return True, 0, self._max_attempts

        window_cutoff = now - timedelta(seconds=self._window)
        last = _ensure_aware(attempt.last_failure_at)
        if last and last < window_cutoff:
            attempt.failed_count = 0
            attempt.locked_until = None
            db.commit()
            return True, 0, self._max_attempts

        return True, 0, self._max_attempts - attempt.failed_count

    def record_failure(self, db: DBSession, key: str) -> None:
        now = datetime.now(timezone.utc)
        attempt = db.scalar(select(LoginAttempt).where(LoginAttempt.key == key))
        if attempt is None:
            attempt = LoginAttempt(key=key, failed_count=1, last_failure_at=now)
            db.add(attempt)
        else:
            locked = _ensure_aware(attempt.locked_until)
            if locked and locked > now:
                return
            attempt.failed_count += 1
            attempt.last_failure_at = now
            if attempt.failed_count >= self._max_attempts:
                attempt.locked_until = now + timedelta(seconds=self._lockout)
        db.commit()

    def record_success(self, db: DBSession, key: str) -> None:
        db.execute(delete(LoginAttempt).where(LoginAttempt.key == key))
        db.commit()