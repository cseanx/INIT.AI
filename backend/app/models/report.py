from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Report(Base):
    """A generated INIT.AI report.

    Every field the frontend report builder captures is stored here so
    generated reports round-trip to the database and back (edit → PUT).
    `area` is a display string produced by the report builder; legacy
    seeded rows fall back to `barangay_name`/city in the API schema.
    """

    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(60))
    status: Mapped[str] = mapped_column(String(30), server_default="ready")

    # Report builder fields
    city: Mapped[str | None] = mapped_column(String(120))
    coverage: Mapped[str | None] = mapped_column(String(30))
    period_start: Mapped[str | None] = mapped_column(String(10))
    period_end: Mapped[str | None] = mapped_column(String(10))
    prepared_by: Mapped[str | None] = mapped_column(String(120))
    area: Mapped[str | None] = mapped_column(String(255))
    auto_priority_areas: Mapped[bool] = mapped_column(default=False)
    datasets: Mapped[list[str]] = mapped_column(JSON, default=list)
    areas: Mapped[list[str]] = mapped_column(JSON, default=list)
    sections: Mapped[list[str]] = mapped_column(JSON, default=list)
    recommendations: Mapped[str] = mapped_column(Text, default="")

    # Computed summary (derived from INIT.AI datasets at build time)
    avg_surface_temp: Mapped[float | None] = mapped_column()
    peak_temp: Mapped[float | None] = mapped_column()
    peak_area: Mapped[str | None] = mapped_column(String(120))
    critical_count: Mapped[int | None] = mapped_column()
    high_count: Mapped[int | None] = mapped_column()
    moderate_count: Mapped[int | None] = mapped_column()
    avg_canopy: Mapped[float | None] = mapped_column()
    mitigation_projects: Mapped[int | None] = mapped_column()

    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Legacy: seeded reports referenced a single barangay.
    barangay_id: Mapped[int | None] = mapped_column(
        ForeignKey("barangays.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    barangay: Mapped["Barangay | None"] = relationship(back_populates="reports")  # type: ignore[name-defined]
    attestations: Mapped[list["ReportAttestation"]] = relationship(  # type: ignore[name-defined]
        back_populates="report", cascade="all, delete-orphan"
    )

    @property
    def barangay_name(self) -> str | None:
        return self.barangay.name if self.barangay else None