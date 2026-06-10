-- ═══════════════════════════════════════════════════════════
-- INIT.AI Seed Data: Quezon City
-- Real coordinates from OpenStreetMap + PAGASA data
-- ═══════════════════════════════════════════════════════════

-- ─── INSERT QUEZON CITY ──────────────────────────────────────
INSERT INTO public.cities (
  name, province, region,
  centroid,
  avg_lst, avg_ndvi, uhi_intensity, canopy_pct,
  impervious_pct, population, area_km2, hotspot_count, risk_level
) VALUES (
  'Quezon City', 'Metro Manila', 'NCR',
  ST_SetSRID(ST_MakePoint(121.0437, 14.6760), 4326),
  38.4, 0.19, 4.8, 18.3,
  62.4, 2960000, 165.3, 12, 'critical'
) ON CONFLICT (name) DO UPDATE SET
  avg_lst = EXCLUDED.avg_lst,
  last_processed = NOW();

-- ─── INSERT MANILA ───────────────────────────────────────────
INSERT INTO public.cities (
  name, province, region,
  centroid,
  avg_lst, avg_ndvi, uhi_intensity, canopy_pct,
  impervious_pct, population, area_km2, hotspot_count, risk_level
) VALUES (
  'Manila', 'Metro Manila', 'NCR',
  ST_SetSRID(ST_MakePoint(120.9842, 14.5995), 4326),
  37.9, 0.11, 5.2, 11.2,
  82.1, 1846641, 42.9, 9, 'critical'
) ON CONFLICT (name) DO NOTHING;

-- ─── INSERT MAKATI ───────────────────────────────────────────
INSERT INTO public.cities (
  name, province, region,
  centroid,
  avg_lst, avg_ndvi, uhi_intensity, canopy_pct,
  impervious_pct, population, area_km2, hotspot_count, risk_level
) VALUES (
  'Makati', 'Metro Manila', 'NCR',
  ST_SetSRID(ST_MakePoint(121.0244, 14.5547), 4326),
  36.8, 0.15, 3.9, 14.7,
  74.3, 582602, 27.4, 6, 'high'
) ON CONFLICT (name) DO NOTHING;

-- ─── INSERT CEBU CITY ────────────────────────────────────────
INSERT INTO public.cities (
  name, province, region,
  centroid,
  avg_lst, avg_ndvi, uhi_intensity, canopy_pct,
  impervious_pct, population, area_km2, hotspot_count, risk_level
) VALUES (
  'Cebu City', 'Cebu', 'Region VII',
  ST_SetSRID(ST_MakePoint(123.8854, 10.3157), 4326),
  35.9, 0.22, 3.2, 22.4,
  61.8, 964169, 315.0, 7, 'moderate'
) ON CONFLICT (name) DO NOTHING;

-- ─── INSERT DAVAO CITY ───────────────────────────────────────
INSERT INTO public.cities (
  name, province, region,
  centroid,
  avg_lst, avg_ndvi, uhi_intensity, canopy_pct,
  impervious_pct, population, area_km2, hotspot_count, risk_level
) VALUES (
  'Davao City', 'Davao del Sur', 'Region XI',
  ST_SetSRID(ST_MakePoint(125.6128, 7.1907), 4326),
  34.2, 0.32, 2.1, 31.8,
  38.2, 1776949, 2444.0, 4, 'low'
) ON CONFLICT (name) DO NOTHING;


-- ─── HOTSPOTS (Quezon City — real coordinates) ───────────────
WITH qc AS (SELECT id FROM public.cities WHERE name = 'Quezon City')
INSERT INTO public.hotspots (
  zone_id, city_id, barangay_name, district,
  location, lst, ndvi, uhi_delta, severity, cause,
  impervious_pct, satellite, acquisition_date
)
SELECT
  zone_id, qc.id, barangay_name, district,
  ST_SetSRID(ST_MakePoint(lng, lat), 4326),
  lst, ndvi, uhi_delta, severity, cause,
  impervious_pct, 'Landsat-9', '2025-05-26'
FROM qc, (VALUES
  ('HS-01','Kamuning','Quezon',     121.0380, 14.6290, 41.2,-0.04, 7.8,'critical','Zero Canopy / Asphalt',      98.0),
  ('HS-02','Cubao',   'Cubao',      121.0520, 14.6190, 39.8, 0.02, 6.4,'critical','Dense Built-up Area',        94.0),
  ('HS-03','Balintawak','Balintawak',120.9990,14.6620, 38.5, 0.05, 5.1,'high',    'Industrial Zone',            88.0),
  ('HS-04','Novaliches','Novaliches',121.0650,14.7170, 37.9, 0.09, 4.5,'high',    'Informal Settlements',       82.0),
  ('HS-05','Commonwealth','Commonwealth',121.0900,14.7040,37.1,0.14,3.7,'moderate','Low Canopy Cover',          76.0),
  ('HS-06','Fairview','Fairview',   121.0560,14.7300, 36.4, 0.18, 3.0,'moderate','Road Network Density',       71.0),
  ('HS-07','Tandang Sora','Tandang', 121.0430,14.6790, 35.8, 0.21, 2.4,'moderate','Impervious Surface',        68.0),
  ('HS-08','Batasan Hills','Batasan',121.1250,14.6790, 35.2, 0.28, 1.8,'low',     'Sparse Vegetation',         58.0),
  ('HS-09','Payatas','Novaliches',  121.0990,14.7260, 34.9, 0.19, 1.5,'low',     'Landfill Proximity',         64.0),
  ('HS-10','Tatalon','Quezon',      121.0190,14.6290, 34.4, 0.32, 1.0,'low',     'Mixed Land Use',             52.0),
  ('HS-11','San Bartolome','Novaliches',121.0140,14.7380,33.9,0.35,0.5,'low',    'Peri-urban Sprawl',          44.0),
  ('HS-12','Project 6','Quezon',    121.0140,14.6400, 33.5, 0.38, 0.1,'low',     'Mixed Residential',          48.0)
) AS v(zone_id, barangay_name, district, lng, lat, lst, ndvi, uhi_delta, severity, cause, impervious_pct)
ON CONFLICT (zone_id) DO UPDATE SET
  lst = EXCLUDED.lst,
  last_updated = NOW();


-- ─── BARANGAYS ───────────────────────────────────────────────
WITH qc AS (SELECT id FROM public.cities WHERE name = 'Quezon City')
INSERT INTO public.barangays (
  code, name, district, city_id,
  location, lst, ndvi, impervious_pct, risk_level, population
)
SELECT
  code, name, district, qc.id,
  ST_SetSRID(ST_MakePoint(lng, lat), 4326),
  lst, ndvi, impervious_pct, risk_level, population
FROM qc, (VALUES
  ('BGY-001','Kamuning',       'Quezon',       121.0380, 14.6290, 41.2,-0.03, 98,'critical', 14820),
  ('BGY-002','Cubao Proper',   'Cubao',        121.0520, 14.6190, 40.1, 0.01, 94,'critical', 22410),
  ('BGY-003','Balintawak',     'Balintawak',   120.9990, 14.6620, 38.9, 0.06, 88,'high',     18640),
  ('BGY-004','Bagong Silangan','Novaliches',   121.0650, 14.7170, 37.9, 0.09, 82,'high',     31200),
  ('BGY-005','Commonwealth',   'Commonwealth', 121.0900, 14.7040, 37.1, 0.14, 76,'moderate', 25600),
  ('BGY-006','Fairview Proper','Fairview',     121.0560, 14.7300, 36.4, 0.18, 71,'moderate', 19800),
  ('BGY-007','Batasan Hills',  'Batasan',      121.1250, 14.6790, 35.2, 0.28, 58,'low',      42100),
  ('BGY-008','Holy Spirit',    'Batasan',      121.1100, 14.6950, 34.8, 0.31, 54,'low',      37500),
  ('BGY-009','Payatas A',      'Novaliches',   121.0990, 14.7260, 34.9, 0.19, 68,'low',      28400),
  ('BGY-010','Tandang Sora',   'Tandang',      121.0430, 14.6790, 35.8, 0.21, 72,'moderate', 16700),
  ('BGY-011','Diliman Proper', 'Diliman',      121.0650, 14.6550, 26.1, 0.44, 28,'low',       8900),
  ('BGY-012','UP Campus',      'Diliman',      121.0614, 14.6547, 24.8, 0.52, 18,'low',       4200)
) AS v(code, name, district, lng, lat, lst, ndvi, impervious_pct, risk_level, population)
ON CONFLICT (code) DO NOTHING;


-- ─── SEED LST TIME SERIES (last 6 months) ───────────────────
INSERT INTO public.lst_timeseries (hotspot_id, city_id, recorded_at, lst, ndvi, satellite)
SELECT
  h.id,
  h.city_id,
  date_series::TIMESTAMPTZ,
  h.lst + (RANDOM() * 2 - 1),  -- ± 1°C variation
  h.ndvi + (RANDOM() * 0.04 - 0.02),
  'Landsat-9'
FROM public.hotspots h
CROSS JOIN generate_series(
  '2024-12-01'::DATE,
  '2025-05-26'::DATE,
  '16 days'::INTERVAL
) AS date_series
WHERE h.zone_id IN ('HS-01','HS-02','HS-03','HS-04')
ON CONFLICT DO NOTHING;


-- ─── SEED ALERTS ─────────────────────────────────────────────
WITH qc AS (SELECT id FROM public.cities WHERE name = 'Quezon City'),
     hs1 AS (SELECT id FROM public.hotspots WHERE zone_id = 'HS-01'),
     hs2 AS (SELECT id FROM public.hotspots WHERE zone_id = 'HS-02')
INSERT INTO public.alerts (
  city_id, hotspot_id, alert_type, title, body,
  trigger_metric, trigger_value, threshold_value, channels_sent
)
VALUES
  (
    (SELECT id FROM qc), (SELECT id FROM hs1),
    'emergency',
    'CRITICAL: Kamuning LST Threshold Exceeded',
    'Surface temperature at HS-01 reached 41.2°C, breaching the 40°C emergency threshold.',
    'lst', 41.2, 40.0, ARRAY['email','sms','dashboard']
  ),
  (
    (SELECT id FROM qc), (SELECT id FROM hs2),
    'emergency',
    'CRITICAL: Cubao Heat Index Alert',
    'Combined heat index >52°C at Cubao District. Vulnerable population risk elevated.',
    'heat_index', 52.1, 48.0, ARRAY['email','sms','dashboard']
  ),
  (
    (SELECT id FROM qc), NULL,
    'warning',
    'WARNING: NDVI Decline Detected — Novaliches',
    'Landsat-9 shows 0.4% canopy reduction in Novaliches barangays 171-180.',
    'ndvi_delta', -0.004, -0.002, ARRAY['email','dashboard']
  );


-- ─── SEED LGU ACTIONS ────────────────────────────────────────
WITH
  qc  AS (SELECT id FROM public.cities    WHERE name     = 'Quezon City'),
  bgk AS (SELECT id FROM public.barangays WHERE code     = 'BGY-001'),
  hs1 AS (SELECT id FROM public.hotspots  WHERE zone_id  = 'HS-01')
INSERT INTO public.lgu_actions (
  action_code, title, city_id, barangay_id, hotspot_id,
  status, priority, intervention_type,
  budget_php, spent_php, progress_pct, trees_planted,
  est_cooling_c, due_date, owner_agency
)
VALUES
  (
    'ACT-001', 'Kamuning Rd Urban Reforestation',
    (SELECT id FROM qc), (SELECT id FROM bgk), (SELECT id FROM hs1),
    'in-progress', 'critical', 'Urban Reforestation',
    18400000, 6200000, 34, 820,
    3.2, '2026-09-01', 'QCENRO'
  ),
  (
    'ACT-002', 'Cubao Cool Pavement Pilot',
    (SELECT id FROM qc), NULL, NULL,
    'planning', 'critical', 'Cool Surface',
    42100000, 0, 8, 0,
    1.8, '2027-01-15', 'DPWH-NCR'
  ),
  (
    'ACT-003', 'Balintawak Green Rooftop Program',
    (SELECT id FROM qc), NULL, NULL,
    'approved', 'high', 'Building Integration',
    9700000, 1100000, 15, 0,
    1.4, '2026-03-01', 'QCBPLD'
  ),
  (
    'ACT-004', 'Commonwealth Water Feature Network',
    (SELECT id FROM qc), NULL, NULL,
    'completed', 'moderate', 'Evaporative Cooling',
    6200000, 6200000, 100, 0,
    0.9, '2025-05-01', 'QCPWD'
  );
