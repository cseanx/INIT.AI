"""Shared query helpers for the reading-style endpoints (heat / canopy)."""

from sqlalchemy import ColumnElement, Select
from sqlalchemy.orm import Session


def fetch_readings(
    db: Session,
    statement: Select,
    order_by: ColumnElement,
    limit: int,
) -> list:
    """Run a reading query ordered newest-first, capped by `limit`."""
    return list(db.scalars(statement.order_by(order_by.desc()).limit(limit)))


def fetch_all(db: Session, statement: Select, limit: int) -> list:
    """Run a catalog query capped by `limit`."""
    return list(db.scalars(statement.limit(limit)))
