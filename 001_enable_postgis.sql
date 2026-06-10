-- ═══════════════════════════════════════════════════════════
-- INIT.AI Migration 001: Enable PostGIS + Core Extensions
-- ═══════════════════════════════════════════════════════════

-- Enable PostGIS spatial extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for fuzzy text search

-- Verify PostGIS is active
SELECT PostGIS_Version();
