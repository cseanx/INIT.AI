from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    region: str
    created_at: datetime
