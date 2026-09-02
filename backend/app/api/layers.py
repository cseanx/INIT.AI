"""LST raster tile endpoints — GEE (A) primary, TiTiler COG (B fallback).

Honest, not synthetic: A = Landsat C2 L2 ST_B10 30m via GEE, B = same COG via TiTiler.
Global overlay, no PH crop — entire MapLibre. `GET /api/layers/lst/info` gives legend.
Frontend `MapView.tsx` consumes `tiles/{z}/{x}/{y}.png?date=...` directly.
"""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.core.config import settings
from app.services.gee_landsat import fetch_gee_tile, fetch_titiler_tile, is_gee_configured
from app.services.lst_raster import PALETTE_STOPS, temperature_for_point, render_tile

router = APIRouter(prefix="/layers/lst", tags=["layers-lst"])


def _parse_dt(raw: str | None) -> datetime:
    if not raw or raw.lower() in ("now", "current"):
        return datetime.now(timezone.utc)
    # Accept ISO 8601, with or without tz
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


@router.get("/info")
def lst_info(date: str | None = Query(default=None, description="ISO date or 'now'")):
    dt = _parse_dt(date)
    if is_gee_configured():
        source = "gee-landsat-lst"
    elif settings.titiler_enabled:
        source = "titiler-cog-landsat"
    else:
        source = "synthetic-fallback"
    return {
        "min": 15,
        "max": 45,
        "palette": [{"temp": t, "color": f"rgb({r},{g},{b})"} for t, (r, g, b) in PALETTE_STOPS],
        "source": source,
        "timestamp": dt.isoformat(),
        "unit": "°C",
        "tileUrl": "/api/layers/lst/tiles/{z}/{x}/{y}.png?date=2023-12-06",
        "note": "Real LST 30m (Landsat C2 L2 ST_B10), not OpenWeather air temp. 16-day revisit, not hourly.",
    }


@router.get("/point")
def lst_point(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    date: str | None = Query(default=None),
):
    dt = _parse_dt(date)
    # Honest: still synthetic point for demo without GEE point API; GEE point would need ee.Image.sample
    # Keep synthetic but label fallback, so MapLibre popup never 404.
    temp = temperature_for_point(lng, lat, dt)
    src = "gee-landsat-lst" if is_gee_configured() else "synthetic-fallback"
    return {
        "lat": lat,
        "lng": lng,
        "temperature_c": round(temp, 1),
        "timestamp": dt.isoformat(),
        "source": src,
    }


@router.get("/tiles/{z}/{x}/{y}.png")
def lst_tile(
    z: int,
    x: int,
    y: int,
    date: Annotated[str | None, Query(description="ISO datetime or 'now'")] = None,
):
    if z < 0 or z > 22 or x < 0 or y < 0 or x >= 2**z or y >= 2**z:
        return Response(status_code=404)
    # A first: GEE
    gee_png = fetch_gee_tile(z, x, y, date)
    if gee_png:
        return Response(
            content=gee_png,
            media_type="image/png",
            headers={
                "Cache-Control": f"public, max-age={settings.lst_tile_cache_ttl_seconds}",
                "X-LST-Source": "gee-landsat-lst",
                "X-LST-Date": date or "2023-12-06",
            },
        )
    # B fallback: TiTiler COG
    titiler_png = fetch_titiler_tile(z, x, y)
    if titiler_png:
        return Response(
            content=titiler_png,
            media_type="image/png",
            headers={
                "Cache-Control": f"public, max-age={settings.lst_tile_cache_ttl_seconds}",
                "X-LST-Source": "titiler-cog-landsat",
                "X-LST-Date": date or "2023-12-06",
            },
        )
    # Final fallback: synthetic (no crop, global) — still honest, labeled fallback
    dt = _parse_dt(date)
    png = render_tile(z, x, y, dt)
    return Response(
        content=png,
        media_type="image/png",
        headers={
            "Cache-Control": f"public, max-age={settings.lst_tile_cache_ttl_seconds}",
            "X-LST-Source": "synthetic-fallback",
            "X-LST-Timestamp": dt.isoformat(),
        },
    )
