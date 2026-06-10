-- ═══════════════════════════════════════════════════════════
-- INIT.AI Migration 002: Users, Cities, Hotspots
-- ═══════════════════════════════════════════════════════════

-- ─── USERS (extends Supabase auth.users) ────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'Research Viewer'
                CHECK (role IN ('Admin', 'LGU Planner', 'Research Viewer')),
  lgu         TEXT,              -- e.g. "Quezon City"
  department  TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'Admin'
    )
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Research Viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── CITIES ─────────────────────────────────────────────────
CREATE TABLE public.cities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL UNIQUE,
  province        TEXT NOT NULL DEFAULT 'Metro Manila',
  region          TEXT NOT NULL DEFAULT 'NCR',
  country         TEXT NOT NULL DEFAULT 'Philippines',
  -- Spatial: city boundary polygon
  boundary        GEOMETRY(MultiPolygon, 4326),
  -- Spatial: city centroid
  centroid        GEOMETRY(Point, 4326),
  -- Stats (updated by satellite processing pipeline)
  avg_lst         NUMERIC(5,2),        -- Average Land Surface Temp °C
  avg_ndvi        NUMERIC(4,3),        -- Average NDVI index
  uhi_intensity   NUMERIC(4,2),        -- UHI = urban - rural baseline °C
  canopy_pct      NUMERIC(5,2),        -- Tree canopy coverage %
  impervious_pct  NUMERIC(5,2),        -- Impervious surface %
  population      INTEGER,
  area_km2        NUMERIC(10,2),
  hotspot_count   INTEGER DEFAULT 0,
  risk_level      TEXT CHECK (risk_level IN ('critical','high','moderate','low')),
  last_processed  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cities_boundary ON public.cities USING GIST (boundary);
CREATE INDEX idx_cities_centroid ON public.cities USING GIST (centroid);

-- ─── HOTSPOTS ───────────────────────────────────────────────
CREATE TABLE public.hotspots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id         TEXT NOT NULL UNIQUE,   -- e.g. "HS-01"
  city_id         UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  barangay_name   TEXT,
  district        TEXT,
  -- Spatial data
  location        GEOMETRY(Point, 4326) NOT NULL,
  boundary        GEOMETRY(Polygon, 4326),
  -- Thermal measurements
  lst             NUMERIC(5,2) NOT NULL,   -- Land Surface Temp °C
  lst_min         NUMERIC(5,2),
  lst_max         NUMERIC(5,2),
  ndvi            NUMERIC(5,3),
  uhi_delta       NUMERIC(4,2),            -- Deviation from city mean
  -- Classification
  severity        TEXT NOT NULL
                    CHECK (severity IN ('critical','high','moderate','low')),
  cause           TEXT,
  impervious_pct  NUMERIC(5,2),
  -- Satellite source
  satellite       TEXT DEFAULT 'Landsat-9',
  acquisition_date DATE,
  cloud_cover     NUMERIC(4,1),
  -- Status
  is_active       BOOLEAN DEFAULT TRUE,
  -- Timestamps
  first_detected  TIMESTAMPTZ DEFAULT NOW(),
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hotspots_location  ON public.hotspots USING GIST (location);
CREATE INDEX idx_hotspots_boundary  ON public.hotspots USING GIST (boundary);
CREATE INDEX idx_hotspots_city_id   ON public.hotspots (city_id);
CREATE INDEX idx_hotspots_severity  ON public.hotspots (severity);
CREATE INDEX idx_hotspots_lst       ON public.hotspots (lst DESC);

-- ─── LST TIME SERIES ────────────────────────────────────────
CREATE TABLE public.lst_timeseries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotspot_id      UUID REFERENCES public.hotspots(id) ON DELETE CASCADE,
  city_id         UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL,
  lst             NUMERIC(5,2) NOT NULL,
  ndvi            NUMERIC(5,3),
  satellite       TEXT,
  cloud_cover     NUMERIC(4,1),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lst_ts_hotspot     ON public.lst_timeseries (hotspot_id, recorded_at DESC);
CREATE INDEX idx_lst_ts_city        ON public.lst_timeseries (city_id, recorded_at DESC);
CREATE INDEX idx_lst_ts_recorded_at ON public.lst_timeseries (recorded_at DESC);
