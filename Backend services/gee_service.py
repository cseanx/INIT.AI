"""
Google Earth Engine (GEE) Service.
Fetches Landsat-9 LST, Sentinel-2 NDVI, and MODIS data
for Philippine cities. Falls back to cached mock data
when GEE credentials are not available (demo mode).
"""

import os
import logging
from datetime import date, timedelta
from typing import Optional, Dict, List, Any
import json

logger = logging.getLogger(__name__)

# Try to import GEE — gracefully degrade if unavailable
try:
    import ee
    GEE_AVAILABLE = True
except ImportError:
    GEE_AVAILABLE = False
    logger.warning("earthengine-api not installed — running in mock mode")


# ─── City Bounding Boxes (lng_min, lat_min, lng_max, lat_max) ─
CITY_BOUNDS = {
    "Quezon City": [120.98, 14.60, 121.13, 14.78],
    "Manila":      [120.96, 14.55, 121.02, 14.65],
    "Makati":      [121.00, 14.53, 121.05, 14.58],
    "Cebu City":   [123.84, 10.27, 123.93, 10.38],
    "Davao City":  [125.57, 7.07,  125.68, 7.24],
    "Caloocan":    [120.96, 14.65, 121.05, 14.78],
}

# Rural reference points for UHI baseline (rural areas near each city)
RURAL_REFS = {
    "Quezon City": [121.12, 14.73],  # La Mesa watershed
    "Manila":      [121.07, 14.50],
    "Makati":      [121.09, 14.48],
}


class GEEService:
    """
    Handles all Google Earth Engine data retrieval.
    In demo mode, returns realistic mock data.
    """

    def __init__(self):
        self.available = GEE_AVAILABLE and self._check_initialized()

    def _check_initialized(self) -> bool:
        try:
            ee.Number(1).getInfo()
            return True
        except Exception:
            return False

    # ─── LST from Landsat-9 ───────────────────────────────────
    async def get_lst_map(
        self,
        city_name: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        cloud_threshold: float = 20.0,
    ) -> Dict[str, Any]:
        """
        Fetch Land Surface Temperature from Landsat-9 TIRS Band 10.
        Returns: tile URL, statistics, acquisition date.
        """
        if not self.available:
            return self._mock_lst(city_name, date_from)

        bounds = CITY_BOUNDS.get(city_name)
        if not bounds:
            raise ValueError(f"City '{city_name}' not in supported cities")

        date_to   = date_to   or date.today()
        date_from = date_from or (date_to - timedelta(days=30))

        try:
            aoi = ee.Geometry.Rectangle(bounds)

            # Landsat 9 Collection 2 Level-2 — SR + LST
            collection = (
                ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
                .filterBounds(aoi)
                .filterDate(str(date_from), str(date_to))
                .filter(ee.Filter.lt("CLOUD_COVER", cloud_threshold))
                .sort("CLOUD_COVER")
            )

            image = collection.first()
            if image is None:
                logger.warning(f"No Landsat-9 imagery for {city_name} in date range")
                return self._mock_lst(city_name, date_from)

            # Convert Band 10 (ST_B10) to Celsius
            # Formula: LST_K = (scale * B10 + offset) → LST_C = LST_K - 273.15
            lst = image.select("ST_B10").multiply(0.00341802).add(149.0).subtract(273.15)

            # Clip to AOI
            lst_clipped = lst.clip(aoi)

            # Compute stats
            stats = lst_clipped.reduceRegion(
                reducer=ee.Reducer.mean()
                    .combine(ee.Reducer.minMax(), sharedInputs=True)
                    .combine(ee.Reducer.stdDev(),  sharedInputs=True),
                geometry=aoi,
                scale=30,
                maxPixels=1e9,
            ).getInfo()

            # Generate tile URL with heat color palette
            vis_params = {
                "min": 24.0,
                "max": 44.0,
                "palette": ["#1a5276", "#00c9a7", "#ffd166", "#ff8c00", "#ff6b2b", "#ff3a1a", "#b71c1c"],
            }
            tile_url = lst_clipped.getMapId(vis_params)["tile_fetcher"].url_format

            # Get acquisition date
            acq_date = ee.Date(image.get("system:time_start")).format("YYYY-MM-dd").getInfo()
            cloud_cover = image.get("CLOUD_COVER").getInfo()

            return {
                "city": city_name,
                "satellite": "Landsat-9",
                "acquisition_date": acq_date,
                "cloud_cover": round(float(cloud_cover), 1),
                "tile_url": tile_url,
                "stats": {
                    "mean_lst":  round(stats.get("ST_B10_mean",  0), 2),
                    "min_lst":   round(stats.get("ST_B10_min",   0), 2),
                    "max_lst":   round(stats.get("ST_B10_max",   0), 2),
                    "std_lst":   round(stats.get("ST_B10_stdDev",0), 2),
                },
                "source": "gee_live",
            }

        except Exception as e:
            logger.error(f"GEE LST error for {city_name}: {e}")
            return self._mock_lst(city_name, date_from)

    # ─── NDVI from Sentinel-2 ─────────────────────────────────
    async def get_ndvi_map(
        self,
        city_name: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Compute NDVI from Sentinel-2 MSI (B8-B4)/(B8+B4).
        """
        if not self.available:
            return self._mock_ndvi(city_name, date_from)

        bounds = CITY_BOUNDS.get(city_name)
        if not bounds:
            raise ValueError(f"City '{city_name}' not supported")

        date_to   = date_to   or date.today()
        date_from = date_from or (date_to - timedelta(days=20))

        try:
            aoi = ee.Geometry.Rectangle(bounds)

            s2 = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(aoi)
                .filterDate(str(date_from), str(date_to))
                .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 15))
                .sort("CLOUDY_PIXEL_PERCENTAGE")
                .first()
            )

            # NDVI = (NIR - Red) / (NIR + Red) = (B8 - B4) / (B8 + B4)
            ndvi = s2.normalizedDifference(["B8", "B4"]).rename("NDVI").clip(aoi)

            stats = ndvi.reduceRegion(
                reducer=ee.Reducer.mean()
                    .combine(ee.Reducer.minMax(), sharedInputs=True),
                geometry=aoi,
                scale=10,
                maxPixels=1e9,
            ).getInfo()

            vis_params = {
                "min": -0.2,
                "max": 0.8,
                "palette": ["#b71c1c", "#ff6b2b", "#ffd166", "#a5c442", "#4caf50", "#1b5e20"],
            }
            tile_url = ndvi.getMapId(vis_params)["tile_fetcher"].url_format
            acq_date = ee.Date(s2.get("system:time_start")).format("YYYY-MM-dd").getInfo()

            mean_ndvi = stats.get("NDVI_mean", 0.19)

            return {
                "city": city_name,
                "satellite": "Sentinel-2",
                "acquisition_date": acq_date,
                "tile_url": tile_url,
                "stats": {
                    "mean_ndvi": round(float(mean_ndvi), 3),
                    "min_ndvi":  round(float(stats.get("NDVI_min",  0)), 3),
                    "max_ndvi":  round(float(stats.get("NDVI_max",  0)), 3),
                    "canopy_pct": round(float(mean_ndvi) * 40, 1),  # rough estimate
                },
                "source": "gee_live",
            }

        except Exception as e:
            logger.error(f"GEE NDVI error for {city_name}: {e}")
            return self._mock_ndvi(city_name, date_from)

    # ─── UHI from MODIS ───────────────────────────────────────
    async def get_uhi_intensity(
        self, city_name: str, acquisition_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calculate UHI intensity using MODIS MOD11A1 daily LST.
        UHI = urban_mean_LST - rural_reference_LST
        """
        if not self.available:
            return self._mock_uhi(city_name)

        bounds = CITY_BOUNDS.get(city_name)
        rural_ref = RURAL_REFS.get(city_name, [121.12, 14.73])
        target_date = acquisition_date or date.today()

        try:
            aoi   = ee.Geometry.Rectangle(bounds)
            rural = ee.Geometry.Point(rural_ref).buffer(5000)

            modis = (
                ee.ImageCollection("MODIS/061/MOD11A1")
                .filterDate(
                    str(target_date - timedelta(days=3)),
                    str(target_date + timedelta(days=1)),
                )
                .first()
                .select("LST_Day_1km")
                .multiply(0.02)
                .subtract(273.15)
            )

            urban_lst = modis.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=aoi,   scale=1000
            ).get("LST_Day_1km").getInfo()

            rural_lst = modis.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=rural, scale=1000
            ).get("LST_Day_1km").getInfo()

            uhi = round(float(urban_lst) - float(rural_lst), 2)
            return {
                "city": city_name,
                "urban_lst": round(float(urban_lst), 2),
                "rural_lst": round(float(rural_lst), 2),
                "uhi_intensity": uhi,
                "date": str(target_date),
                "source": "gee_live",
            }

        except Exception as e:
            logger.error(f"GEE UHI error for {city_name}: {e}")
            return self._mock_uhi(city_name)

    # ─── Mock Data (Demo / Fallback) ──────────────────────────
    def _mock_lst(self, city: str, acq_date: Optional[date] = None) -> Dict[str, Any]:
        mock_stats = {
            "Quezon City": {"mean": 38.4, "min": 23.1, "max": 41.2, "std": 3.8},
            "Manila":      {"mean": 37.9, "min": 24.0, "max": 40.8, "std": 3.2},
            "Makati":      {"mean": 36.8, "min": 24.5, "max": 39.6, "std": 2.9},
            "Cebu City":   {"mean": 35.9, "min": 25.1, "max": 38.4, "std": 2.6},
            "Davao City":  {"mean": 34.2, "min": 26.0, "max": 37.1, "std": 2.1},
        }
        s = mock_stats.get(city, {"mean": 36.0, "min": 24.0, "max": 40.0, "std": 3.0})
        return {
            "city": city,
            "satellite": "Landsat-9 (mock)",
            "acquisition_date": str(acq_date or date.today()),
            "cloud_cover": 3.0,
            "tile_url": None,
            "stats": {"mean_lst": s["mean"], "min_lst": s["min"], "max_lst": s["max"], "std_lst": s["std"]},
            "source": "mock",
        }

    def _mock_ndvi(self, city: str, acq_date: Optional[date] = None) -> Dict[str, Any]:
        mock = {
            "Quezon City": 0.19, "Manila": 0.11, "Makati": 0.15,
            "Cebu City": 0.22,  "Davao City": 0.32,
        }
        ndvi = mock.get(city, 0.18)
        return {
            "city": city,
            "satellite": "Sentinel-2 (mock)",
            "acquisition_date": str(acq_date or date.today()),
            "tile_url": None,
            "stats": {
                "mean_ndvi": ndvi, "min_ndvi": -0.05, "max_ndvi": 0.58,
                "canopy_pct": round(ndvi * 40, 1),
            },
            "source": "mock",
        }

    def _mock_uhi(self, city: str) -> Dict[str, Any]:
        mock = {
            "Quezon City": 4.8, "Manila": 5.2, "Makati": 3.9,
            "Cebu City": 3.2,  "Davao City": 2.1,
        }
        uhi = mock.get(city, 3.5)
        return {
            "city": city,
            "urban_lst": 38.4,
            "rural_lst": round(38.4 - uhi, 1),
            "uhi_intensity": uhi,
            "date": str(date.today()),
            "source": "mock",
        }


# Singleton
gee_service = GEEService()
