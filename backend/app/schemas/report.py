from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator
from pydantic.alias_generators import to_camel


class ReportBase(BaseModel):
    """Accept camelCase field names (as the frontend sends them) while
    keeping snake_case internally."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str
    type: str
    status: str = "ready"

    city: str | None = None
    coverage: str | None = None
    period_start: str | None = None
    period_end: str | None = None
    prepared_by: str | None = None
    area: str | None = None
    auto_priority_areas: bool = False
    datasets: list[str] = []
    areas: list[str] = []
    sections: list[str] = []
    recommendations: str = ""

    avg_surface_temp: float | None = None
    peak_temp: float | None = None
    peak_area: str | None = None
    critical_count: int | None = None
    high_count: int | None = None
    moderate_count: int | None = None
    avg_canopy: float | None = None
    mitigation_projects: int | None = None

    generated_at: datetime | None = None


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    """Partial update — only provided fields are written."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")

    title: str | None = None
    type: str | None = None
    status: str | None = None
    city: str | None = None
    coverage: str | None = None
    period_start: str | None = None
    period_end: str | None = None
    prepared_by: str | None = None
    area: str | None = None
    auto_priority_areas: bool | None = None
    datasets: list[str] | None = None
    areas: list[str] | None = None
    sections: list[str] | None = None
    recommendations: str | None = None
    avg_surface_temp: float | None = None
    peak_temp: float | None = None
    peak_area: str | None = None
    critical_count: int | None = None
    high_count: int | None = None
    moderate_count: int | None = None
    avg_canopy: float | None = None
    mitigation_projects: int | None = None
    generated_at: datetime | None = None


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    title: str
    type: str
    status: str
    created_at: datetime
    barangay_name: str | None = None

    city: str | None = None
    coverage: str | None = None
    period_start: str | None = None
    period_end: str | None = None
    prepared_by: str | None = None
    area: str | None = None
    auto_priority_areas: bool = False
    datasets: list[str] = []
    areas: list[str] = []
    sections: list[str] = []
    recommendations: str = ""

    avg_surface_temp: float | None = None
    peak_temp: float | None = None
    peak_area: str | None = None
    critical_count: int | None = None
    high_count: int | None = None
    moderate_count: int | None = None
    avg_canopy: float | None = None
    mitigation_projects: int | None = None

    generated_at: datetime | None = None

    # Display fields the frontend table expects. `date` is the generated-on
    # date; `area` falls back to the legacy barangay for seeded rows.
    date: str = ""

    @model_validator(mode="after")
    def fill_display_fields(self) -> "ReportOut":
        if not self.area:
            if self.barangay_name:
                self.area = self.barangay_name
            elif self.city:
                self.area = f"{self.city} ({self.coverage or 'All Areas'})"
        if not self.date:
            self.date = self.created_at.strftime("%b %d, %Y")
        return self