from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

ThemeName = Literal["system", "dark", "light"]
AccentName = Literal["sunset", "ocean", "canopy", "amber", "violet"]


class UserPreferenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    theme: ThemeName
    accent: AccentName
    sidebar_collapsed: bool
    updated_at: datetime


class UserPreferenceUpdate(BaseModel):
    theme: ThemeName | None = None
    accent: AccentName | None = None
    sidebar_collapsed: bool | None = None
