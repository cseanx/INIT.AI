from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MitigationProject(Base):
    __tablename__ = "mitigation_projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    barangay_id: Mapped[int] = mapped_column(
        ForeignKey("barangays.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), server_default="Proposed")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    barangay: Mapped["Barangay"] = relationship(back_populates="mitigation_projects")  # type: ignore[name-defined]

    @property
    def barangay_name(self) -> str:
        return self.barangay.name
