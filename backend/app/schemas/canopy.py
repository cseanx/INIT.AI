from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CanopyReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    barangay_id: int
    barangay_name: str
    canopy_percentage: float
    recorded_at: datetime
