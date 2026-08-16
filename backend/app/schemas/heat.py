from datetime import datetime

from pydantic import BaseModel, ConfigDict


class HeatReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    barangay_id: int
    barangay_name: str
    temperature: float
    recorded_at: datetime
