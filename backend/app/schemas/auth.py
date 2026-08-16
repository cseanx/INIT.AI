from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.core.config import settings


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    created_at: datetime
