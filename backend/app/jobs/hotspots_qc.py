"""Build the real Quezon City 8-day hotspot snapshot.

This is the pilot pipeline for QC: read the raw MODIS Aqua 8-day LST COG and
its QC layer from the Microsoft Planetary Computer, compute per-barangay
statistics against PSA/NAMRIA boundaries, join ESA WorldCover tree/built-up
fractions, and write a snapshot consumed by the API and the bundled frontend
fallback.

Run from `backend/`:

    python -m app.jobs.hotspots_qc --persist

The defaults use the latest Aqua 8-day item that intersects Quezon City. The
map's weekly layer uses the same period; the API reads the persisted snapshot.
"""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import planetary_computer
import rasterio
from affine import Affine
from pystac_client import Client
from rasterio.enums import Resampling
from rasterio.features import rasterize
from rasterio.warp import transform_bounds, transform_geom
from rasterio.windows import from_bounds

STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
CITY = "Quezon City"
QC_BBOX = (120.90, 14.50, 121.20, 14.85)
MIN_VALID_PCT = 30.0

BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_DIR / "app" / "data"
BOUNDARY_PATH = DATA_DIR / "barangays_qc.geojson"
OUTPUT_PATH = DATA_DIR / "hotspots_qc_latest.json"
PUBLIC_OUTPUT_PATH = BACKEND_DIR.parent / "public" / "data" / "hotspots_qc_latest.json"


def _open_client() -> Client:
    return Client.open(STAC_URL)


def _latest_lst_items(limit: int = 8) -> list[Any]:
    client = _open_client()
    end = datetime.now(UTC)
    start = end - timedelta(days=120)
    search = client.search(
        collections=["modis-11A2-061"],
        bbox=QC_BBOX,
        datetime=f"{start.date().isoformat()}/{end.date().isoformat()}",
        limit=50,
    )
    items = [item for item in search.items() if item.id.startswith("MYD11A2")]
    items.sort(key=lambda item: item.properties["start_datetime"], reverse=True)
    return items[:limit]


def _latest_worldcover_item() -> Any:
    client = _open_client()
    search = client.search(
        collections=["esa-worldcover"],
        bbox=QC_BBOX,
        limit=20,
    )
    items = [item for item in search.items() if "2021" in item.id]
    if not items:
        raise RuntimeError("No ESA WorldCover 2021 item intersects Quezon City")
    items.sort(key=lambda item: item.id, reverse=True)
    return items[0]


def _qc_valid_mask(lst: np.ndarray, qc: np.ndarray) -> np.ndarray:
    """Keep clear-sky pixels with LST error <= 2 K.

    QC_Day bits 0-1: 00 good, 01 other quality, 10 cloud, 11 not produced.
    Bits 6-7: 00 <=1 K, 01 <=2 K, 10 <=3 K, 11 >3 K.
    """
    mandatory = qc & 0b11
    error = (qc >> 6) & 0b11
    return (lst > 0) & (lst != 65535) & (mandatory <= 1) & (error <= 1)


def _read_lst_grid(item: Any) -> tuple[np.ndarray, np.ndarray, Any, Any]:
    signed = planetary_computer.sign_item(item)
    lst_url = signed.assets["LST_Day_1km"].href
    qc_url = signed.assets["QC_Day"].href

    with rasterio.open(lst_url) as src:
        bounds = transform_bounds("EPSG:4326", src.crs, *QC_BBOX)
        window = from_bounds(*bounds, transform=src.transform).round_offsets().round_lengths()
        lst_raw = src.read(1, window=window)
        transform = src.window_transform(window)
        crs = src.crs

    with rasterio.open(qc_url) as qc_src:
        qc = qc_src.read(1, window=window)

    lst_c = lst_raw.astype("float32") * 0.02 - 273.15
    valid = _qc_valid_mask(lst_raw, qc)
    return lst_c, valid, transform, crs


def _read_worldcover_grid() -> tuple[np.ndarray, Any]:
    item = _latest_worldcover_item()
    signed = planetary_computer.sign_item(item)
    with rasterio.open(signed.assets["map"].href) as src:
        window = from_bounds(*QC_BBOX, transform=src.transform).round_offsets().round_lengths()
        # 10 m source; sample at 50 m for fast zonal fractions.
        out_shape = (max(1, int(window.height) // 5), max(1, int(window.width) // 5))
        data = src.read(
            1,
            window=window,
            out_shape=out_shape,
            resampling=Resampling.nearest,
        )
        transform = src.window_transform(window) * Affine.scale(5, 5)
    return data, transform


def _feature_mask(feature: dict[str, Any], shape: tuple[int, int], transform: Any, crs: Any) -> np.ndarray:
    geometry = transform_geom("EPSG:4326", crs, feature["geometry"], precision=6)
    return rasterize(
        [(geometry, 1)],
        out_shape=shape,
        transform=transform,
        fill=0,
        all_touched=True,
        dtype="uint8",
    ).astype(bool)


def _area_ha(feature: dict[str, Any]) -> float:
    props = feature["properties"]
    area_m2 = props.get("area_crs")
    if isinstance(area_m2, (int, float)) and area_m2 > 0:
        return float(area_m2) / 10_000
    area_km2 = props.get("area_km2")
    if isinstance(area_km2, (int, float)) and area_km2 > 0:
        return float(area_km2) * 100
    return 0.0


def _driver(tree_pct: float, built_pct: float) -> str:
    if built_pct >= 50 and tree_pct < 15:
        return f"{built_pct:.0f}% built-up · {tree_pct:.0f}% tree cover"
    if built_pct >= 50:
        return f"{built_pct:.0f}% built-up · limited shade"
    if tree_pct < 20:
        return f"{tree_pct:.0f}% tree cover · exposed surface"
    if tree_pct >= 40:
        return f"{tree_pct:.0f}% tree cover · high-canopy baseline"
    return f"{built_pct:.0f}% built-up · {tree_pct:.0f}% tree cover"


def build_snapshot() -> dict[str, Any]:
    features = json.loads(BOUNDARY_PATH.read_text(encoding="utf-8"))["features"]
    items = _latest_lst_items()
    if not items:
        raise RuntimeError("No Aqua MYD11A2 items found for Quezon City")

    latest = items[0]
    previous = items[1] if len(items) > 1 else None
    lst_c, valid, transform, crs = _read_lst_grid(latest)
    prev_p90: dict[str, float] = {}
    if previous is not None:
        prev_c, prev_valid, _, _ = _read_lst_grid(previous)
        for feature in features:
            mask = _feature_mask(feature, lst_c.shape, transform, crs)
            values = prev_c[mask & prev_valid]
            if values.size >= 2:
                prev_p90[str(feature["properties"].get("adm4_psgc"))] = float(
                    np.percentile(values, 90)
                )

    wc_data, wc_transform = _read_worldcover_grid()

    raw: list[dict[str, Any]] = []
    no_data: list[str] = []
    below_threshold: list[str] = []

    for feature in features:
        props = feature["properties"]
        name = str(props.get("adm4_en") or "Unnamed barangay")
        psgc = str(props.get("adm4_psgc") or "")
        mask = _feature_mask(feature, lst_c.shape, transform, crs)
        total_pixels = int(mask.sum())
        values = lst_c[mask & valid]
        valid_count = int(values.size)
        valid_pct = (valid_count / total_pixels * 100) if total_pixels else 0.0

        if valid_count == 0 or valid_pct < MIN_VALID_PCT:
            no_data.append(name)
            continue

        wc_mask = _feature_mask(feature, wc_data.shape, wc_transform, "EPSG:4326")
        wc_values = wc_data[wc_mask]
        tree_pct = float((wc_values == 10).mean() * 100) if wc_values.size else 0.0
        built_pct = float((wc_values == 50).mean() * 100) if wc_values.size else 0.0

        p90 = float(np.percentile(values, 90))
        mean = float(values.mean())
        trend = None
        if psgc in prev_p90:
            trend = round(p90 - prev_p90[psgc], 1)

        raw.append(
            {
                "psgc": psgc,
                "name": name,
                "temp": round(p90, 1),
                "mean_lst": round(mean, 1),
                "p90_lst": round(p90, 1),
                "canopy": round(tree_pct),
                "tree_cover_pct": round(tree_pct, 1),
                "built_pct": round(built_pct, 1),
                "canopyChange": None,
                "trend": trend,
                "area": round(_area_ha(feature)),
                "valid_pixel_pct": round(valid_pct, 1),
                "valid_pixels": valid_count,
                "driver": _driver(tree_pct, built_pct),
                "priority": False,
                "severity": "moderate",
            }
        )

    if not raw:
        raise RuntimeError("No barangays had enough clear-sky LST pixels")

    p90_values = [entry["p90_lst"] for entry in raw]
    q50, q75, q90 = (float(value) for value in np.percentile(p90_values, [50, 75, 90]))
    canopies = [entry["tree_cover_pct"] for entry in raw]
    median_canopy = float(np.median(canopies))

    hotspots: list[dict[str, Any]] = []
    for entry in raw:
        p90 = entry["p90_lst"]
        if p90 >= q90:
            entry["severity"] = "critical"
        elif p90 >= q75:
            entry["severity"] = "high"
        elif p90 >= q50:
            entry["severity"] = "moderate"
        else:
            below_threshold.append(entry["name"])
            continue

        entry["priority"] = entry["severity"] == "critical" or (
            entry["severity"] == "high"
            and entry["tree_cover_pct"] <= median_canopy
        )
        hotspots.append(entry)

    hotspots.sort(key=lambda entry: entry["p90_lst"], reverse=True)
    period_start = str(latest.properties["start_datetime"])[:10]
    period_end = str(latest.properties["end_datetime"])[:10]

    return {
        "meta": {
            "city": CITY,
            "period_start": period_start,
            "period_end": period_end,
            "generated_at": datetime.now(UTC).isoformat(),
            "source": "NASA MODIS Aqua MYD11A2 8-day LST (LST_Day_1km), QC_Day",
            "source_url": "https://planetarycomputer.microsoft.com/dataset/modis-11A2-061",
            "canopy_source": "ESA WorldCover 2021 v200 (tree cover class 10)",
            "boundary_source": "PSA/NAMRIA 2023 via faeldon/philippines-json-maps (indicative)",
            "method_version": "qc-8day-v1",
            "valid_pixel_min_pct": MIN_VALID_PCT,
            "total_barangays": len(features),
            "hotspot_count": len(hotspots),
            "no_data_count": len(no_data),
            "below_threshold_count": len(below_threshold),
            "no_data_areas": no_data,
            "thresholds": {
                "moderate_p90_c": round(q50, 1),
                "high_p90_c": round(q75, 1),
                "critical_p90_c": round(q90, 1),
            },
        },
        "items": hotspots,
    }


def write_snapshot(payload: dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    if PUBLIC_OUTPUT_PATH.parent.exists():
        PUBLIC_OUTPUT_PATH.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
    print(f"Wrote {OUTPUT_PATH} ({len(payload['items'])} hotspots)")


def persist_snapshot(payload: dict[str, Any]) -> None:
    try:
        from sqlalchemy import select

        from app.db.base import Base
        from app.db.session import SessionLocal, engine
        from app.models import HotspotSnapshot

        Base.metadata.create_all(engine)
        meta = payload["meta"]
        with SessionLocal() as db:
            existing = db.scalar(
                select(HotspotSnapshot).where(
                    HotspotSnapshot.city == meta["city"],
                    HotspotSnapshot.period_start == meta["period_start"],
                    HotspotSnapshot.method_version == meta["method_version"],
                )
            )
            if existing is None:
                existing = HotspotSnapshot(
                    city=meta["city"],
                    period_start=meta["period_start"],
                    period_end=meta["period_end"],
                    generated_at=datetime.fromisoformat(meta["generated_at"]),
                    source=meta["source"],
                    method_version=meta["method_version"],
                    payload=payload,
                )
                db.add(existing)
            else:
                existing.generated_at = datetime.fromisoformat(meta["generated_at"])
                existing.payload = payload
            db.commit()
        print("Persisted hotspot snapshot to the database")
    except Exception as error:  # noqa: BLE001 - the JSON remains the fallback
        print(f"Database persistence skipped: {error}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--persist",
        action="store_true",
        help="Write the snapshot to the database in addition to the JSON file",
    )
    parser.add_argument(
        "--if-newer",
        action="store_true",
        help="Skip when the bundled snapshot already covers the latest 8-day period",
    )
    args = parser.parse_args()

    if args.if_newer and OUTPUT_PATH.exists():
        latest = _latest_lst_items(limit=1)
        if latest:
            existing = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
            meta = existing.get("meta") or {}
            latest_start = str(latest[0].properties["start_datetime"])[:10]
            latest_end = str(latest[0].properties["end_datetime"])[:10]
            if (
                meta.get("period_start") == latest_start
                and meta.get("period_end") == latest_end
            ):
                print(
                    "Snapshot already covers the latest period "
                    f"({latest_start} to {latest_end}); nothing to do."
                )
                return

    payload = build_snapshot()
    write_snapshot(payload)
    if args.persist:
        persist_snapshot(payload)


if __name__ == "__main__":
    main()
