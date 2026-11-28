from datetime import datetime

from sqlalchemy import DateTime, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HotspotSnapshot(Base):
    """One versioned, real hotspot snapshot for a city.

    The payload holds the API/frontend shape (meta + items); the columns make
    the latest snapshot easy to query and keep the provenance visible.
    """

    __tablename__ = "hotspot_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "city",
            "period_start",
            "method_version",
            name="uq_hotspot_snapshots_city_period_method",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    city: Mapped[str] = mapped_column(String(120), index=True)
    period_start: Mapped[str] = mapped_column(String(10), index=True)
    period_end: Mapped[str] = mapped_column(String(10))
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    source: Mapped[str] = mapped_column(String(255))
    method_version: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
