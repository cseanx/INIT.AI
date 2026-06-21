"""
PostGIS / GeoAlchemy2 spatial utility helpers.
"""

from typing import Optional, Tuple
from geoalchemy2.shape import to_shape
from geoalchemy2 import WKBElement
from shapely.geometry import Point, mapping
import json


def wkb_to_geojson(wkb: Optional[WKBElement]) -> Optional[dict]:
    """Convert a WKBElement (from PostGIS) to a GeoJSON dict."""
    if wkb is None:
        return None
    shape = to_shape(wkb)
    return mapping(shape)


def point_to_geojson(wkb: Optional[WKBElement]) -> Optional[dict]:
    """Convert a PostGIS POINT to GeoJSON Point dict."""
    geojson = wkb_to_geojson(wkb)
    if geojson is None:
        return None
    return {"type": "Point", "coordinates": list(geojson["coordinates"])}


def make_point_wkt(lng: float, lat: float) -> str:
    """Create a WKT POINT string for PostGIS insertion."""
    return f"SRID=4326;POINT({lng} {lat})"


def make_polygon_wkt(coordinates: list) -> str:
    """Create a WKT POLYGON string for PostGIS insertion."""
    coord_str = ", ".join(f"{lng} {lat}" for lng, lat in coordinates)
    return f"SRID=4326;POLYGON(({coord_str}))"


def coords_to_bbox(
    lng: float, lat: float, buffer_km: float = 5.0
) -> Tuple[float, float, float, float]:
    """
    Create a bounding box around a point with a given buffer in km.
    Returns (min_lng, min_lat, max_lng, max_lat).
    1 degree ≈ 111 km at equator.
    """
    delta = buffer_km / 111.0
    return (
        lng - delta,
        lat - delta,
        lng + delta,
        lat + delta,
    )


def severity_from_lst(lst: float, city_mean_lst: float = 35.0) -> str:
    """Classify hotspot severity based on LST value."""
    delta = lst - city_mean_lst
    if lst >= 40.0 or delta >= 6.0:
        return "critical"
    elif lst >= 38.0 or delta >= 4.0:
        return "high"
    elif lst >= 36.0 or delta >= 2.0:
        return "moderate"
    else:
        return "low"


def ndvi_classification(ndvi: float) -> str:
    """Classify NDVI value into vegetation density category."""
    if ndvi < 0.0:
        return "water_or_built"
    elif ndvi < 0.1:
        return "bare"
    elif ndvi < 0.2:
        return "sparse"
    elif ndvi < 0.3:
        return "low"
    elif ndvi < 0.4:
        return "moderate"
    elif ndvi < 0.6:
        return "good"
    else:
        return "dense"


def uhi_intensity(urban_lst: float, rural_lst: float) -> float:
    """Calculate Urban Heat Island intensity (°C difference)."""
    return round(urban_lst - rural_lst, 2)


def cooling_potential(canopy_pct: float, target_pct: float = 30.0) -> float:
    """
    Estimate cooling potential in °C if canopy reaches target.
    Rule of thumb: each 1% canopy increase ≈ 0.12°C cooling.
    """
    gap = max(0.0, target_pct - canopy_pct)
    return round(gap * 0.12, 2)


def trees_to_target(
    current_canopy_pct: float,
    target_canopy_pct: float = 30.0,
    trees_per_pct: int = 480,
) -> int:
    """Estimate number of trees needed to reach canopy target."""
    gap = max(0.0, target_canopy_pct - current_canopy_pct)
    return int(gap * trees_per_pct)
