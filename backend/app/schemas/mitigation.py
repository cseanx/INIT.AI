from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MitigationProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    barangay_id: int
    barangay_name: str
    title: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
