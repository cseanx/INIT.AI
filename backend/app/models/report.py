from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(60))
    barangay_id: Mapped[int | None] = mapped_column(
        ForeignKey("barangays.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[str] = mapped_column(String(30), server_default="ready")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    barangay: Mapped["Barangay | None"] = relationship(back_populates="reports")  # type: ignore[name-defined]

    @property
    def barangay_name(self) -> str | None:
        return self.barangay.name if self.barangay else None
