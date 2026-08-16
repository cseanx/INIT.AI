from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class HeatData(Base):
    __tablename__ = "heat_data"

    id: Mapped[int] = mapped_column(primary_key=True)
    barangay_id: Mapped[int] = mapped_column(
        ForeignKey("barangays.id", ondelete="CASCADE"), index=True
    )
    temperature: Mapped[float] = mapped_column(Numeric(4, 1))
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    barangay: Mapped["Barangay"] = relationship(back_populates="heat_data")  # type: ignore[name-defined]

    @property
    def barangay_name(self) -> str:
        return self.barangay.name
