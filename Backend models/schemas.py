"""
Pydantic v2 schemas for request validation and API responses.
"""

from __future__ import annotations
from datetime import datetime, date
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator
import json


# ─── SHARED ───────────────────────────────────────────────────
class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [lng, lat]


class PaginationMeta(BaseModel):
    total: int
    page: int
    per_page: int
    pages: int


class PaginatedResponse(BaseModel):
    data: List[Any]
    meta: PaginationMeta


# ─── AUTH ─────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)
    role: str = Field(default="Research Viewer")
    lgu: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        allowed = {"Admin", "LGU Planner", "Research Viewer"}
        if v not in allowed:
            raise ValueError(f"Role must be one of {allowed}")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "ProfileOut"


class ProfileOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    lgu: Optional[str] = None
    department: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    lgu: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None


# ─── CITIES ───────────────────────────────────────────────────
class CityOut(BaseModel):
    id: UUID
    name: str
    province: str
    region: str
    avg_lst: Optional[float] = None
    avg_ndvi: Optional[float] = None
    uhi_intensity: Optional[float] = None
    canopy_pct: Optional[float] = None
    impervious_pct: Optional[float] = None
    population: Optional[int] = None
    area_km2: Optional[float] = None
    hotspot_count: int = 0
    risk_level: Optional[str] = None
    last_processed: Optional[datetime] = None
    centroid: Optional[GeoPoint] = None

    class Config:
        from_attributes = True


class CityStats(BaseModel):
    city_id: UUID
    city_name: str
    avg_lst: float
    max_lst: float
    min_lst: float
    avg_ndvi: float
    uhi_intensity: float
    hotspot_count: int
    canopy_pct: float
    impervious_pct: float
    cooling_potential: float
    risk_level: str
    last_updated: datetime


# ─── HOTSPOTS ─────────────────────────────────────────────────
class HotspotOut(BaseModel):
    id: UUID
    zone_id: str
    city_id: UUID
    barangay_name: Optional[str] = None
    district: Optional[str] = None
    lst: float
    lst_min: Optional[float] = None
    lst_max: Optional[float] = None
    ndvi: Optional[float] = None
    uhi_delta: Optional[float] = None
    severity: str
    cause: Optional[str] = None
    impervious_pct: Optional[float] = None
    satellite: Optional[str] = None
    acquisition_date: Optional[date] = None
    is_active: bool
    last_updated: datetime
    location: Optional[GeoPoint] = None

    class Config:
        from_attributes = True


class HotspotCreate(BaseModel):
    zone_id: str
    city_id: UUID
    barangay_name: Optional[str] = None
    district: Optional[str] = None
    lng: float = Field(ge=-180, le=180)
    lat: float = Field(ge=-90, le=90)
    lst: float
    ndvi: Optional[float] = None
    severity: str
    cause: Optional[str] = None
    impervious_pct: Optional[float] = None
    satellite: Optional[str] = "Landsat-9"
    acquisition_date: Optional[date] = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v):
        allowed = {"critical", "high", "moderate", "low"}
        if v not in allowed:
            raise ValueError(f"Severity must be one of {allowed}")
        return v


class HotspotUpdate(BaseModel):
    lst: Optional[float] = None
    ndvi: Optional[float] = None
    severity: Optional[str] = None
    cause: Optional[str] = None
    is_active: Optional[bool] = None


# ─── THERMAL ──────────────────────────────────────────────────
class LSTDataPoint(BaseModel):
    recorded_at: datetime
    lst: float
    ndvi: Optional[float] = None
    satellite: Optional[str] = None


class ThermalSummary(BaseModel):
    city_name: str
    acquisition_date: date
    mean_lst: float
    max_lst: float
    min_lst: float
    std_lst: float
    hotspot_count: int
    critical_count: int
    high_count: int
    satellite: str
    cloud_cover: Optional[float] = None


class ThermalTimeSeriesResponse(BaseModel):
    hotspot_id: UUID
    zone_id: str
    city_name: str
    data: List[LSTDataPoint]
    trend: str  # "rising" | "falling" | "stable"
    change_30d: float


# ─── NDVI ─────────────────────────────────────────────────────
class NDVIZoneOut(BaseModel):
    zone_name: str
    ndvi: float
    classification: str  # "bare", "sparse", "low", "moderate", "good", "dense"
    canopy_pct: float
    area_ha: Optional[float] = None
    change_vs_baseline: Optional[float] = None


class NDVISummary(BaseModel):
    city_name: str
    mean_ndvi: float
    min_ndvi: float
    max_ndvi: float
    canopy_pct: float
    canopy_target_pct: float
    canopy_gap_pct: float
    trees_required: int
    acquisition_date: date
    zones: List[NDVIZoneOut]


# ─── BARANGAY ─────────────────────────────────────────────────
class BarangayOut(BaseModel):
    id: UUID
    code: str
    name: str
    district: Optional[str] = None
    city_id: UUID
    lst: Optional[float] = None
    ndvi: Optional[float] = None
    impervious_pct: Optional[float] = None
    canopy_pct: Optional[float] = None
    tree_count: int = 0
    risk_level: Optional[str] = None
    population: Optional[int] = None
    area_ha: Optional[float] = None
    location: Optional[GeoPoint] = None
    linked_hotspot_id: Optional[UUID] = None

    class Config:
        from_attributes = True


# ─── FORECAST ─────────────────────────────────────────────────
class ForecastPoint(BaseModel):
    date: date
    predicted_lst: float
    lower_bound: float
    upper_bound: float
    confidence: float


class ForecastResponse(BaseModel):
    city_name: str
    hotspot_id: Optional[UUID] = None
    horizon_days: int
    model: str
    accuracy_pct: float
    el_nino_factor: float
    data: List[ForecastPoint]
    peak_date: date
    peak_lst: float
    trend: str


class InterventionForecast(BaseModel):
    date: date
    bau_lst: float           # Business as usual
    with_intervention_lst: float
    cooling_benefit: float


# ─── LGU ACTIONS ──────────────────────────────────────────────
class ActionOut(BaseModel):
    id: UUID
    action_code: str
    title: str
    description: Optional[str] = None
    city_id: UUID
    barangay_id: Optional[UUID] = None
    status: str
    priority: str
    intervention_type: Optional[str] = None
    budget_php: Optional[float] = None
    spent_php: float = 0
    progress_pct: int = 0
    trees_planted: int = 0
    est_cooling_c: Optional[float] = None
    est_co2_kg_yr: Optional[int] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    completed_date: Optional[date] = None
    owner_agency: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ActionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    city_id: UUID
    barangay_id: Optional[UUID] = None
    hotspot_id: Optional[UUID] = None
    priority: str = "moderate"
    intervention_type: Optional[str] = None
    budget_php: Optional[float] = None
    funding_source: Optional[str] = None
    est_cooling_c: Optional[float] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    owner_agency: Optional[str] = None


class ActionUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    spent_php: Optional[float] = None
    progress_pct: Optional[int] = None
    trees_planted: Optional[int] = None
    completed_date: Optional[date] = None
    description: Optional[str] = None


# ─── SURVEYS ──────────────────────────────────────────────────
class SurveyOut(BaseModel):
    id: UUID
    survey_code: str
    barangay_id: Optional[UUID] = None
    city_id: UUID
    field_lst: Optional[float] = None
    field_ndvi: Optional[float] = None
    field_humidity: Optional[float] = None
    field_notes: Optional[str] = None
    photo_urls: Optional[List[str]] = None
    photo_count: int = 0
    surveyor_name: Optional[str] = None
    surveyed_at: date
    status: str
    location: Optional[GeoPoint] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SurveyCreate(BaseModel):
    city_id: UUID
    barangay_id: Optional[UUID] = None
    lng: float = Field(ge=-180, le=180)
    lat: float = Field(ge=-90, le=90)
    field_lst: Optional[float] = None
    field_ndvi: Optional[float] = None
    field_humidity: Optional[float] = None
    field_notes: Optional[str] = None
    surveyed_at: date = Field(default_factory=date.today)


# ─── ALERTS ───────────────────────────────────────────────────
class AlertOut(BaseModel):
    id: UUID
    city_id: UUID
    hotspot_id: Optional[UUID] = None
    alert_type: str
    title: str
    body: str
    trigger_metric: Optional[str] = None
    trigger_value: Optional[float] = None
    threshold_value: Optional[float] = None
    channels_sent: Optional[List[str]] = None
    is_active: bool
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AlertCreate(BaseModel):
    city_id: UUID
    hotspot_id: Optional[UUID] = None
    alert_type: str
    title: str
    body: str
    trigger_metric: Optional[str] = None
    trigger_value: Optional[float] = None
    threshold_value: Optional[float] = None


# ─── NOTIFICATIONS ────────────────────────────────────────────
class NotificationOut(BaseModel):
    id: UUID
    alert_id: Optional[UUID] = None
    title: str
    body: Optional[str] = None
    notif_type: str
    channel: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── SATELLITE ────────────────────────────────────────────────
class SatelliteSceneOut(BaseModel):
    id: UUID
    city_id: UUID
    scene_id: str
    satellite: str
    acquisition_date: date
    cloud_cover: Optional[float] = None
    status: str
    lst_tile_url: Optional[str] = None
    ndvi_tile_url: Optional[str] = None
    rgb_tile_url: Optional[str] = None
    mean_lst: Optional[float] = None
    mean_ndvi: Optional[float] = None
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── MITIGATION / ROI ─────────────────────────────────────────
class MitigationScenario(BaseModel):
    city_id: UUID
    tree_count: int = 2400
    paving_km2: float = 18.0
    rooftop_sites: int = 14
    water_features: int = 8
    scenario: str = "moderate"  # conservative | moderate | aggressive


class ROIResult(BaseModel):
    total_investment_php: float
    projected_cooling_c: float
    energy_savings_php_yr: float
    health_cost_avoided_php_yr: float
    payback_years: float
    co2_offset_kg_yr: int
    combined_impact_c: float
    interventions: List[dict]


# ─── REPORTS ──────────────────────────────────────────────────
class ReportRequest(BaseModel):
    city_id: UUID
    report_type: str  # "monthly_uhi" | "ndvi_change" | "roi_analysis" | "executive_brief"
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    include_maps: bool = True
    format: str = "pdf"  # "pdf" | "xlsx" | "csv"


class ReportOut(BaseModel):
    id: str
    title: str
    report_type: str
    city_name: str
    generated_at: datetime
    file_url: str
    file_size_kb: int
    status: str


# ─── AI CHAT ──────────────────────────────────────────────────
class AIChatRequest(BaseModel):
    message: str
    city_id: Optional[UUID] = None
    context: Optional[str] = None  # "hotspot" | "forecast" | "mitigation"


class AIChatResponse(BaseModel):
    reply: str
    sources: Optional[List[str]] = None
    suggested_actions: Optional[List[str]] = None


# ─── UPLOAD ───────────────────────────────────────────────────
class UploadResponse(BaseModel):
    file_id: str
    filename: str
    size_bytes: int
    data_type: str
    status: str
    records_found: Optional[int] = None
    preview_url: Optional[str] = None
    created_at: datetime
