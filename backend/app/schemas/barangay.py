from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BarangayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    city_id: int
    city_name: str
    name: str
    created_at: datetime
