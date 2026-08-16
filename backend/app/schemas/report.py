from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    type: str
    barangay_id: int | None
    barangay_name: str | None
    status: str
    created_at: datetime
