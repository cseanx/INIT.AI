"""
SQLAlchemy ORM models for INIT.AI.
Mirrors the Supabase/PostgreSQL schema with PostGIS geometry columns.
"""

import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text,
    DateTime, Date, ForeignKey, ARRAY, Numeric, CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY as PG_ARRAY
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from models.database import Base


def new_uuid():
    return str(uuid.uuid4())


# ─── PROFILES ─────────────────────────────────────────────────
class Profile(Base):
    __tablename__ = "profiles"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email       = Column(String, nullable=False, unique=True)
    full_name   = Column(String, nullable=False)
    role        = Column(String, nullable=False, default="Research Viewer")
    lgu         = Column(String)
    department  = Column(String)
    phone       = Column(String)
    avatar_url  = Column(String)
    is_active   = Column(Boolean, default=True)
    last_login  = Column(DateTime(timezone=True))
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at  = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    actions_created     = relationship("LGUAction",    back_populates="creator", foreign_keys="LGUAction.created_by")
    surveys_submitted   = relationship("FieldSurvey",  back_populates="surveyor", foreign_keys="FieldSurvey.surveyor_id")
    notifications       = relationship("Notification", back_populates="user")


# ─── CITIES ───────────────────────────────────────────────────
class City(Base):
    __tablename__ = "cities"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name            = Column(String, nullable=False, unique=True)
    province        = Column(String, nullable=False, default="Metro Manila")
    region          = Column(String, nullable=False, default="NCR")
    country         = Column(String, nullable=False, default="Philippines")
    boundary        = Column(Geometry("MULTIPOLYGON", srid=4326))
    centroid        = Column(Geometry("POINT", srid=4326))
    avg_lst         = Column(Numeric(5, 2))
    avg_ndvi        = Column(Numeric(4, 3))
    uhi_intensity   = Column(Numeric(4, 2))
    canopy_pct      = Column(Numeric(5, 2))
    impervious_pct  = Column(Numeric(5, 2))
    population      = Column(Integer)
    area_km2        = Column(Numeric(10, 2))
    hotspot_count   = Column(Integer, default=0)
    risk_level      = Column(String)
    last_processed  = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    hotspots        = relationship("Hotspot",        back_populates="city")
    barangays       = relationship("Barangay",       back_populates="city")
    lgu_actions     = relationship("LGUAction",      back_populates="city")
    alerts          = relationship("Alert",          back_populates="city")
    satellite_scenes= relationship("SatelliteScene", back_populates="city")
    lst_timeseries  = relationship("LSTTimeSeries",  back_populates="city")


# ─── HOTSPOTS ─────────────────────────────────────────────────
class Hotspot(Base):
    __tablename__ = "hotspots"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id         = Column(String, nullable=False, unique=True)
    city_id         = Column(UUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"))
    barangay_name   = Column(String)
    district        = Column(String)
    location        = Column(Geometry("POINT", srid=4326), nullable=False)
    boundary        = Column(Geometry("POLYGON", srid=4326))
    lst             = Column(Numeric(5, 2), nullable=False)
    lst_min         = Column(Numeric(5, 2))
    lst_max         = Column(Numeric(5, 2))
    ndvi            = Column(Numeric(5, 3))
    uhi_delta       = Column(Numeric(4, 2))
    severity        = Column(String, nullable=False)
    cause           = Column(String)
    impervious_pct  = Column(Numeric(5, 2))
    satellite       = Column(String, default="Landsat-9")
    acquisition_date= Column(Date)
    cloud_cover     = Column(Numeric(4, 1))
    is_active       = Column(Boolean, default=True)
    first_detected  = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_updated    = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    city            = relationship("City",          back_populates="hotspots")
    timeseries      = relationship("LSTTimeSeries", back_populates="hotspot")
    alerts          = relationship("Alert",         back_populates="hotspot")
    linked_barangays= relationship("Barangay",      back_populates="linked_hotspot")


# ─── LST TIME SERIES ──────────────────────────────────────────
class LSTTimeSeries(Base):
    __tablename__ = "lst_timeseries"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hotspot_id  = Column(UUID(as_uuid=True), ForeignKey("hotspots.id", ondelete="CASCADE"))
    city_id     = Column(UUID(as_uuid=True), ForeignKey("cities.id",   ondelete="CASCADE"))
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    lst         = Column(Numeric(5, 2), nullable=False)
    ndvi        = Column(Numeric(5, 3))
    satellite   = Column(String)
    cloud_cover = Column(Numeric(4, 1))
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)

    hotspot     = relationship("Hotspot", back_populates="timeseries")
    city        = relationship("City",    back_populates="lst_timeseries")


# ─── BARANGAYS ────────────────────────────────────────────────
class Barangay(Base):
    __tablename__ = "barangays"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code            = Column(String, nullable=False, unique=True)
    name            = Column(String, nullable=False)
    district        = Column(String)
    city_id         = Column(UUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"))
    location        = Column(Geometry("POINT",        srid=4326))
    boundary        = Column(Geometry("MULTIPOLYGON", srid=4326))
    lst             = Column(Numeric(5, 2))
    ndvi            = Column(Numeric(5, 3))
    impervious_pct  = Column(Numeric(5, 2))
    canopy_pct      = Column(Numeric(5, 2))
    tree_count      = Column(Integer, default=0)
    risk_level      = Column(String)
    population      = Column(Integer)
    area_ha         = Column(Numeric(10, 2))
    linked_hotspot_id = Column(UUID(as_uuid=True), ForeignKey("hotspots.id"))
    last_updated    = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)

    city            = relationship("City",    back_populates="barangays")
    linked_hotspot  = relationship("Hotspot", back_populates="linked_barangays", foreign_keys=[linked_hotspot_id])
    surveys         = relationship("FieldSurvey", back_populates="barangay")
    lgu_actions     = relationship("LGUAction",   back_populates="barangay")


# ─── LGU ACTIONS ──────────────────────────────────────────────
class LGUAction(Base):
    __tablename__ = "lgu_actions"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_code         = Column(String, nullable=False, unique=True)
    title               = Column(String, nullable=False)
    description         = Column(Text)
    city_id             = Column(UUID(as_uuid=True), ForeignKey("cities.id",     ondelete="CASCADE"))
    barangay_id         = Column(UUID(as_uuid=True), ForeignKey("barangays.id"))
    hotspot_id          = Column(UUID(as_uuid=True), ForeignKey("hotspots.id"))
    status              = Column(String, nullable=False, default="planning")
    priority            = Column(String, nullable=False, default="moderate")
    intervention_type   = Column(String)
    budget_php          = Column(Numeric(15, 2))
    spent_php           = Column(Numeric(15, 2), default=0)
    funding_source      = Column(String)
    progress_pct        = Column(Integer, default=0)
    trees_planted       = Column(Integer, default=0)
    est_cooling_c       = Column(Numeric(4, 2))
    est_co2_kg_yr       = Column(Integer)
    start_date          = Column(Date)
    due_date            = Column(Date)
    completed_date      = Column(Date)
    owner_agency        = Column(String)
    created_by          = Column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    created_at          = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at          = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    city        = relationship("City",      back_populates="lgu_actions")
    barangay    = relationship("Barangay",  back_populates="lgu_actions")
    creator     = relationship("Profile",   back_populates="actions_created", foreign_keys=[created_by])


# ─── FIELD SURVEYS ────────────────────────────────────────────
class FieldSurvey(Base):
    __tablename__ = "field_surveys"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survey_code     = Column(String, nullable=False, unique=True)
    barangay_id     = Column(UUID(as_uuid=True), ForeignKey("barangays.id"))
    city_id         = Column(UUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"))
    location        = Column(Geometry("POINT", srid=4326), nullable=False)
    field_lst       = Column(Numeric(5, 2))
    field_ndvi      = Column(Numeric(5, 3))
    field_humidity  = Column(Numeric(4, 1))
    field_notes     = Column(Text)
    photo_urls      = Column(PG_ARRAY(Text))
    photo_count     = Column(Integer, default=0)
    surveyor_id     = Column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    surveyor_name   = Column(String)
    surveyed_at     = Column(Date, default=date.today)
    status          = Column(String, default="pending")
    verified_by     = Column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    verified_at     = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)

    barangay    = relationship("Barangay", back_populates="surveys")
    surveyor    = relationship("Profile",  back_populates="surveys_submitted", foreign_keys=[surveyor_id])


# ─── ALERTS ───────────────────────────────────────────────────
class Alert(Base):
    __tablename__ = "alerts"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    city_id         = Column(UUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"))
    hotspot_id      = Column(UUID(as_uuid=True), ForeignKey("hotspots.id"))
    alert_type      = Column(String, nullable=False)
    title           = Column(String, nullable=False)
    body            = Column(Text, nullable=False)
    trigger_metric  = Column(String)
    trigger_value   = Column(Numeric)
    threshold_value = Column(Numeric)
    channels_sent   = Column(PG_ARRAY(Text))
    recipient_count = Column(Integer, default=0)
    is_active       = Column(Boolean, default=True)
    is_read         = Column(Boolean, default=False)
    acknowledged_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    acknowledged_at = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)

    city        = relationship("City",    back_populates="alerts")
    hotspot     = relationship("Hotspot", back_populates="alerts")
    notifications = relationship("Notification", back_populates="alert")


# ─── NOTIFICATIONS ────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    alert_id    = Column(UUID(as_uuid=True), ForeignKey("alerts.id"))
    title       = Column(String, nullable=False)
    body        = Column(Text)
    notif_type  = Column(String, default="info")
    channel     = Column(String)
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)

    user    = relationship("Profile", back_populates="notifications")
    alert   = relationship("Alert",   back_populates="notifications")


# ─── SATELLITE SCENES ─────────────────────────────────────────
class SatelliteScene(Base):
    __tablename__ = "satellite_scenes"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    city_id          = Column(UUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"))
    scene_id         = Column(String, nullable=False)
    satellite        = Column(String, nullable=False)
    acquisition_date = Column(Date, nullable=False)
    cloud_cover      = Column(Numeric(4, 1))
    status           = Column(String, default="pending")
    lst_tile_url     = Column(String)
    ndvi_tile_url    = Column(String)
    rgb_tile_url     = Column(String)
    min_lst          = Column(Numeric(5, 2))
    max_lst          = Column(Numeric(5, 2))
    mean_lst         = Column(Numeric(5, 2))
    mean_ndvi        = Column(Numeric(5, 3))
    processed_at     = Column(DateTime(timezone=True))
    created_at       = Column(DateTime(timezone=True), default=datetime.utcnow)

    city = relationship("City", back_populates="satellite_scenes")
