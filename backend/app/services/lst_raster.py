"""LST raster tile generator — continuous, hourly, palette Image 2.

Replaces the 18-vector-box mock with a 256×256 PNG generated per XYZ tile.
Phase 1: deterministic synthetic field that varies hourly (so map looks realtime
without any external API key). Phase 2: swap `temperature_at(lng,lat,dt)` to
query Himawari-8 / OpenWeather / ERA5 — tile encoder stays identical.

Palette Image 2 — INIT.AI thermal 15→45°C for honest LST:
  15  #1a3a8f deep blue  → 20 #2a7fff → 25 #00d4ff cyan
  28  #00e676 green → 32 #a0ff00 yellow-green → 35 #ffd23f yellow
  38  #ff8c42 orange → 42 #ff2d55 red → 45 #b0003a deep red/magenta
"""
from __future__ import annotations

import hashlib
import math
from datetime import datetime, timezone
from io import BytesIO

import numpy as np
from PIL import Image

from app.core.config import settings

# Image 2 stops — ordered low→high. Positions normalized 0→1 where 0=-40, 1=40.
# We use piecewise linear interpolation between stops.
PALETTE_STOPS: list[tuple[float, tuple[int, int, int]]] = [
    (15, (26, 58, 143)),   # deep blue 15
    (20, (42, 127, 255)),  # blue
    (25, (0, 212, 255)),   # cyan
    (28, (0, 230, 118)),   # green
    (32, (160, 255, 0)),   # yellow-green
    (35, (255, 210, 63)),  # yellow
    (38, (255, 140, 66)),  # orange
    (42, (255, 45, 85)),   # red
    (45, (176, 0, 58)),    # deep red/magenta 45
]

TILE_SIZE = 256


def _deg2num_lat_lng(zoom: int, x: int, y: int) -> tuple[float, float, float, float]:
    """Return (min_lng, min_lat, max_lng, max_lat) for XYZ tile."""
    n = 2.0 ** zoom
    lon_left = x / n * 360.0 - 180.0
    lon_right = (x + 1) / n * 360.0 - 180.0
    lat_top = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_bottom = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lon_left, lat_bottom, lon_right, lat_top


def _hourly_phase(dt: datetime) -> float:
    """0→1 phase for diurnal cycle (PH Time PHT UTC+8)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    utc = dt.astimezone(timezone.utc)
    pht_hour = (utc.hour + 8) % 24 + utc.minute / 60.0 + utc.second / 3600.0
    # Peak ~14:00 PHT, trough ~05:00
    return math.sin((pht_hour - 5) / 24 * 2 * math.pi) * 0.5 + 0.5


def _hash_noise(lng: float, lat: float, seed: int) -> float:
    """Deterministic -1→1 noise per location (stable across tiles)."""
    h = hashlib.md5(f"{lng:.4f},{lat:.4f},{seed}".encode()).hexdigest()
    # use first 8 hex → 0→1 → -1→1
    v = int(h[:8], 16) / 0xFFFFFFFF
    return v * 2 - 1


def temperature_at(lng: float, lat: float, dt: datetime | None = None) -> float:
    """Continuous temperature field -40→40 for any point.

    Synthetic but physically plausible for PH: urban cores hotter, highlands cooler,
    diurnal swing ~8°C, seasonal ~2°C, per-pixel micro-variation.
    Replace body with Himawari/OpenWeather fetch when provider is wired; signature stays.
    """
    if dt is None:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    # Base field: Philippines lat 4.6-21.2, lng 116.9-126.6
    # Highland penalty (Baguio-like): lat ~16.4, cooler
    highland = -6 * math.exp(-((lat - 16.4) ** 2 + (lng - 120.6) ** 2) / 8)
    # Urban heat: Metro Manila 14.6,121.0
    urban = 7 * math.exp(-((lat - 14.60) ** 2 + (lng - 121.03) ** 2) / 0.8)
    cebu = 5 * math.exp(-((lat - 10.31) ** 2 + (lng - 123.89) ** 2) / 0.9)
    davao = 4 * math.exp(-((lat - 7.07) ** 2 + (lng - 125.61) ** 2) / 0.9)

    # Large-scale lat gradient: south slightly hotter
    lat_gradient = (lat - 10) * 0.35

    # Seasonal (month): May hottest, Dec coolest
    month_phase = math.sin((dt.month - 5) / 12 * 2 * math.pi) * 1.5

    # Diurnal: peak 14:00 PHT
    diurnal = _hourly_phase(dt) * 8  # 0→8

    # Micro noise per location + per hour (so tiles change hourly but smoothly)
    hour_seed = dt.year * 10000 + dt.month * 100 + dt.day
    hour_seed = hour_seed * 24 + dt.hour
    noise = _hash_noise(lng, lat, hour_seed) * 2.2
    # Secondary high-freq noise for detail
    noise2 = _hash_noise(lng * 1.7, lat * 1.7, hour_seed + 999) * 0.9

    base = 22.0 + highland + urban + cebu + davao + lat_gradient + month_phase + diurnal + noise + noise2

    # Clamp to palette range
    mn = settings.lst_min_c
    mx = settings.lst_max_c
    if base < mn:
        base = mn + (base - mn) * 0.15 + mn * 0.02
        if base < mn:
            base = mn + abs(_hash_noise(lng, lat, hour_seed + 1)) * 1.2
    if base > mx:
        base = mx - (base - mx) * 0.15
        if base > mx:
            base = mx - abs(_hash_noise(lng, lat, hour_seed + 2)) * 1.0
    # Final clamp
    if base < mn:
        base = mn
    if base > mx:
        base = mx
    return float(base)


def _color_for_temp(temp: float) -> tuple[int, int, int]:
    """Linear interpolate palette."""
    # Clamp
    if temp <= PALETTE_STOPS[0][0]:
        return PALETTE_STOPS[0][1]
    if temp >= PALETTE_STOPS[-1][0]:
        return PALETTE_STOPS[-1][1]
    for i in range(len(PALETTE_STOPS) - 1):
        t0, c0 = PALETTE_STOPS[i]
        t1, c1 = PALETTE_STOPS[i + 1]
        if t0 <= temp <= t1:
            f = (temp - t0) / (t1 - t0) if t1 != t0 else 0
            r = int(c0[0] + (c1[0] - c0[0]) * f)
            g = int(c0[1] + (c1[1] - c0[1]) * f)
            b = int(c0[2] + (c1[2] - c0[2]) * f)
            return (r, g, b)
    return PALETTE_STOPS[-1][1]


def render_tile(z: int, x: int, y: int, dt: datetime | None = None) -> bytes:
    """Render 256×256 PNG for XYZ tile at time dt. Returns PNG bytes."""
    if dt is None:
        dt = datetime.now(timezone.utc)
    min_lng, min_lat, max_lng, max_lat = _deg2num_lat_lng(z, x, y)

    # Quick ocean mask: outer PH sea tiles are mostly water - make them slightly transparent
    # For now we render everywhere; frontend ocean is basemap. We add subtle alpha variation
    # based on distance from PH archipelago center.

    lons = np.linspace(min_lng, max_lng, TILE_SIZE)
    lats = np.linspace(max_lat, min_lat, TILE_SIZE)  # top→bottom
    lon_grid, lat_grid = np.meshgrid(lons, lats)

    # Vectorized temperature
    # We can't vectorize _hash_noise easily, so we use a faster approximation for tile bulk:
    # Use numpy random seeded by tile + hour for reproducibility then smooth.
    # For true per-pixel hash we fallback to python loop for small tiles? Keep fast path:
    # Use sinusoid + seeded noise texture.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    month_phase = math.sin((dt.month - 5) / 12 * 2 * math.pi) * 1.5
    diurnal = _hourly_phase(dt) * 8
    # Seamless, tile-continuous noise — based on lng/lat + hour, not per-tile rng
    # (previous per-tile RNG caused visible seams at tile boundaries)
    hour_phase = (dt.hour + dt.minute / 60.0) * 0.5  # 0-12 phase for hourly drift
    # Large-scale smooth variation (10-30km)
    noise_large = np.sin(lon_grid * 3.0 + hour_phase) * np.cos(lat_grid * 3.0 + hour_phase * 0.7) * 1.1
    # Medium detail (3-8km) — continuous, no seam
    noise_med = np.sin(lon_grid * 12.0 + lat_grid * 9.0 + hour_phase * 1.3) * 0.6
    noise_med += np.cos(lon_grid * 17.0 - lat_grid * 11.0 + hour_phase) * 0.4
    # High freq drizzle (1km)
    noise_small = np.sin((lon_grid + lat_grid) * 28.0 + hour_phase * 2.1) * 0.35
    noise_smooth = noise_large + noise_med
    noise2 = noise_small

    # Vectorized highland/urban: compute distance fields
    highland = -6 * np.exp(-((lat_grid - 16.4) ** 2 + (lon_grid - 120.6) ** 2) / 8)
    urban = 7 * np.exp(-((lat_grid - 14.60) ** 2 + (lon_grid - 121.03) ** 2) / 0.8)
    cebu = 5 * np.exp(-((lat_grid - 10.31) ** 2 + (lon_grid - 123.89) ** 2) / 0.9)
    davao = 4 * np.exp(-((lat_grid - 7.07) ** 2 + (lon_grid - 125.61) ** 2) / 0.9)
    lat_grad = (lat_grid - 10) * 0.35

    temp_grid = 22.0 + highland + urban + cebu + davao + lat_grad + month_phase + diurnal + noise_smooth * 1.6

    # Add tiny high-freq
    temp_grid = temp_grid + noise2 * 0.7

    # Clamp to -40..40
    mn = settings.lst_min_c
    mx = settings.lst_max_c
    temp_grid = np.clip(temp_grid, mn, mx)

    # Map to RGB via palette lookup (vectorized)
    # Build lookup table 512 entries for -40→40 (0.156 per step) then interpolate
    lut_size = 512
    lut = np.zeros((lut_size, 3), dtype=np.uint8)
    for i in range(lut_size):
        t = mn + (mx - mn) * i / (lut_size - 1)
        lut[i] = _color_for_temp(t)
    # Map temp → lut index
    idx = ((temp_grid - mn) / (mx - mn) * (lut_size - 1)).astype(np.int32)
    idx = np.clip(idx, 0, lut_size - 1)
    rgb = lut[idx]  # (256,256,3)

    # Alpha: make ocean tiles slightly transparent toward edges of PH extent
    # Simple mask: if far from PH center, lower alpha? Keep 180/255 for land-like, 0 for pure sea? For now uniform 185
    # Let outside PH bounds (lon <116.9 or >126.6 or lat <4.6 or >21.2) be transparent
    # But tile bbox may straddle; we compute per-pixel outside check
    # Global overlay — no crop (entire MapLibre), honest LST will be transparent where no Landsat scene exists (masked by GEE)
    # For synthetic fallback we keep global so map doesn't look cropped.
    alpha = np.full((TILE_SIZE, TILE_SIZE), 255, dtype=np.uint8)
    # However for tiles fully outside PH, we still return transparent PNG (MapLibre will show basemap)
    # If tile is fully outside, we could return fully transparent quickly, but keep uniform logic

    arr = np.dstack([rgb, alpha])  # (256,256,4)
    im = Image.fromarray(arr, mode="RGBA")
    buf = BytesIO()
    im.save(buf, format="PNG", compress_level=6)
    return buf.getvalue()


def temperature_for_point(lng: float, lat: float, dt: datetime | None = None) -> float:
    """Single-point query used by inspector popup."""
    return temperature_at(lng, lat, dt)
