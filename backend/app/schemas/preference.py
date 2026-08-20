from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

ThemeName = Literal["system", "dark", "light"]


class UserPreferenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    theme: ThemeName
    sidebar_collapsed: bool
    updated_at: datetime


class UserPreferenceUpdate(BaseModel):
    theme: ThemeName | None = None
    sidebar_collapsed: bool | None = None
