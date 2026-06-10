-- ═══════════════════════════════════════════════════════════
-- INIT.AI Migration 003: Barangays, Actions, Surveys, Alerts
-- ═══════════════════════════════════════════════════════════

-- ─── BARANGAYS ──────────────────────────────────────────────
CREATE TABLE public.barangays (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,   -- e.g. "BGY-001"
  name            TEXT NOT NULL,
  district        TEXT,
  city_id         UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  -- Spatial
  location        GEOMETRY(Point, 4326),
  boundary        GEOMETRY(MultiPolygon, 4326),
  -- Thermal profile
  lst             NUMERIC(5,2),
  ndvi            NUMERIC(5,3),
  impervious_pct  NUMERIC(5,2),
  canopy_pct      NUMERIC(5,2),
  tree_count      INTEGER DEFAULT 0,
  risk_level      TEXT CHECK (risk_level IN ('critical','high','moderate','low')),
  -- Demographics
  population      INTEGER,
  area_ha         NUMERIC(10,2),
  -- Links
  linked_hotspot_id UUID REFERENCES public.hotspots(id),
  -- Meta
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_barangays_boundary ON public.barangays USING GIST (boundary);
CREATE INDEX idx_barangays_city_id  ON public.barangays (city_id);


-- ─── LGU ACTIONS ────────────────────────────────────────────
CREATE TABLE public.lgu_actions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_code     TEXT NOT NULL UNIQUE,   -- e.g. "ACT-001"
  title           TEXT NOT NULL,
  description     TEXT,
  city_id         UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  barangay_id     UUID REFERENCES public.barangays(id),
  hotspot_id      UUID REFERENCES public.hotspots(id),
  -- Classification
  status          TEXT NOT NULL DEFAULT 'planning'
                    CHECK (status IN ('planning','approved','in-progress','completed','cancelled')),
  priority        TEXT NOT NULL DEFAULT 'moderate'
                    CHECK (priority IN ('critical','high','moderate','low')),
  intervention_type TEXT,
  -- Budget
  budget_php      NUMERIC(15,2),
  spent_php       NUMERIC(15,2) DEFAULT 0,
  funding_source  TEXT,
  -- Progress
  progress_pct    INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  trees_planted   INTEGER DEFAULT 0,
  -- Impact estimates
  est_cooling_c   NUMERIC(4,2),    -- Estimated cooling impact °C
  est_co2_kg_yr   INTEGER,
  -- Timeline
  start_date      DATE,
  due_date        DATE,
  completed_date  DATE,
  -- Ownership
  owner_agency    TEXT,
  created_by      UUID REFERENCES public.profiles(id),
  -- Meta
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_actions_city_id   ON public.lgu_actions (city_id);
CREATE INDEX idx_actions_status    ON public.lgu_actions (status);
CREATE INDEX idx_actions_priority  ON public.lgu_actions (priority);


-- ─── FIELD SURVEYS ──────────────────────────────────────────
CREATE TABLE public.field_surveys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_code     TEXT NOT NULL UNIQUE,   -- e.g. "SRV-001"
  barangay_id     UUID REFERENCES public.barangays(id),
  city_id         UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  -- Spatial
  location        GEOMETRY(Point, 4326) NOT NULL,
  -- Field measurements
  field_lst       NUMERIC(5,2),
  field_ndvi      NUMERIC(5,3),
  field_humidity  NUMERIC(4,1),
  field_notes     TEXT,
  -- Media
  photo_urls      TEXT[],
  photo_count     INTEGER DEFAULT 0,
  -- Surveyor
  surveyor_id     UUID REFERENCES public.profiles(id),
  surveyor_name   TEXT,
  surveyed_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Verification
  status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','verified','rejected')),
  verified_by     UUID REFERENCES public.profiles(id),
  verified_at     TIMESTAMPTZ,
  -- Meta
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_surveys_location   ON public.field_surveys USING GIST (location);
CREATE INDEX idx_surveys_city_id    ON public.field_surveys (city_id);
CREATE INDEX idx_surveys_status     ON public.field_surveys (status);


-- ─── ALERTS ─────────────────────────────────────────────────
CREATE TABLE public.alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id         UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  hotspot_id      UUID REFERENCES public.hotspots(id),
  -- Alert details
  alert_type      TEXT NOT NULL
                    CHECK (alert_type IN ('emergency','warning','watch','info')),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  -- Trigger
  trigger_metric  TEXT,     -- e.g. "lst", "ndvi", "rate_of_rise"
  trigger_value   NUMERIC,
  threshold_value NUMERIC,
  -- Notifications
  channels_sent   TEXT[],   -- ['email','sms','dashboard']
  recipient_count INTEGER DEFAULT 0,
  -- Status
  is_active       BOOLEAN DEFAULT TRUE,
  is_read         BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMPTZ,
  -- Meta
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_city_id    ON public.alerts (city_id);
CREATE INDEX idx_alerts_type       ON public.alerts (alert_type);
CREATE INDEX idx_alerts_active     ON public.alerts (is_active, created_at DESC);

-- Enable Realtime on alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;


-- ─── NOTIFICATIONS ──────────────────────────────────────────
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  alert_id        UUID REFERENCES public.alerts(id),
  title           TEXT NOT NULL,
  body            TEXT,
  notif_type      TEXT DEFAULT 'info'
                    CHECK (notif_type IN ('emergency','alert','info')),
  channel         TEXT,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user_id   ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notif_is_read   ON public.notifications (user_id, is_read);

-- Enable Realtime on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ─── SATELLITE SCENES ───────────────────────────────────────
CREATE TABLE public.satellite_scenes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id         UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  scene_id        TEXT NOT NULL,          -- GEE scene identifier
  satellite       TEXT NOT NULL,          -- 'Landsat-9', 'Sentinel-2', etc.
  acquisition_date DATE NOT NULL,
  cloud_cover     NUMERIC(4,1),
  -- Processing status
  status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','ready','failed')),
  -- Layer URLs (tile endpoints)
  lst_tile_url    TEXT,
  ndvi_tile_url   TEXT,
  rgb_tile_url    TEXT,
  -- Stats
  min_lst         NUMERIC(5,2),
  max_lst         NUMERIC(5,2),
  mean_lst        NUMERIC(5,2),
  mean_ndvi       NUMERIC(5,3),
  -- Meta
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scenes_city_id  ON public.satellite_scenes (city_id, acquisition_date DESC);
CREATE INDEX idx_scenes_status   ON public.satellite_scenes (status);
