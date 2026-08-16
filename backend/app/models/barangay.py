from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.canopy import CanopyData
    from app.models.city import City
    from app.models.heat import HeatData
    from app.models.mitigation import MitigationProject
    from app.models.report import Report


class Barangay(Base):
    __tablename__ = "barangays"
    __table_args__ = (UniqueConstraint("city_id", "name", name="uq_barangays_city_id_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    city_id: Mapped[int] = mapped_column(
        ForeignKey("cities.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    city: Mapped["City"] = relationship(back_populates="barangays")
    heat_data: Mapped[list["HeatData"]] = relationship(back_populates="barangay")
    canopy_data: Mapped[list["CanopyData"]] = relationship(back_populates="barangay")
    mitigation_projects: Mapped[list["MitigationProject"]] = relationship(
        back_populates="barangay"
    )
    reports: Mapped[list["Report"]] = relationship(back_populates="barangay")

    @property
    def city_name(self) -> str:
        return self.city.name
