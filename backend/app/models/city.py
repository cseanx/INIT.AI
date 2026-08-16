from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.barangay import Barangay


class City(Base):
    __tablename__ = "cities"
    __table_args__ = (UniqueConstraint("name", name="uq_cities_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    region: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    barangays: Mapped[list["Barangay"]] = relationship(back_populates="city")
