"""Tests for the GeoJSON hashing pipeline (Week 2).

Run: `python -m pytest tests/test_geojson_hash.py -q` (from `backend/`).
"""

import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.geojson_hash import (  # noqa: E402
    canonical_geojson,
    geojson_hash,
    geojson_hash_of_str,
)


def sample_fc(**overrides):
    base = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [121.0, 14.62],
                            [121.18, 14.62],
                            [121.18, 14.78],
                            [121.0, 14.78],
                            [121.0, 14.62],
                        ]
                    ],
                },
                "properties": {
                    "id": "lst-002",
                    "name": "Quezon City Plateau",
                    "temperature_c": 40.1,
                    "timestamp": "2026-08-19T14:30:00+08:00",
                    "source": "INIT.AI mock composite",
                },
            }
        ],
    }
    base.update(overrides)
    return base


def test_deterministic():
    a = geojson_hash(sample_fc())
    b = geojson_hash(sample_fc())
    assert a == b
    assert len(a) == 64


def test_key_order_independence():
    # Same logical GeoJSON, different key order -> same hash.
    unordered = {
        "features": sample_fc()["features"],
        "type": "FeatureCollection",
    }
    assert geojson_hash(unordered) == geojson_hash(sample_fc())


def test_content_change_changes_hash():
    original = geojson_hash(sample_fc())
    fc = sample_fc()
    fc["features"][0]["properties"]["temperature_c"] = 41.0
    assert geojson_hash(fc) != original


def test_coordinate_rounding_absorbs_float_noise():
    # 121.1800001 vs 121.18 differ beyond 6dp noise -> same hash after rounding.
    a = sample_fc()
    b = sample_fc()
    b["features"][0]["geometry"]["coordinates"][0][1][0] = 121.1800000001
    assert geojson_hash(a) == geojson_hash(b)


def test_integral_floats_match_js():
    fc_float = sample_fc()
    fc_float["features"][0]["geometry"]["coordinates"][0][0][0] = 121.0
    canonical = canonical_geojson(fc_float)
    # 121.0 serializes as 121 (like JS), not 121.0
    assert "[121,14.62]" in canonical


def test_known_vector_matches_manual_sha256():
    fc = sample_fc()
    canonical = canonical_geojson(fc)
    manual = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    assert geojson_hash(fc) == manual
    assert canonical.startswith('{"features":[')


def test_unicode_not_escaped():
    fc = sample_fc()
    fc["features"][0]["properties"]["name"] = "Muñoz, José"
    canonical = canonical_geojson(fc)
    assert "Muñoz" in canonical


def test_hash_of_str_roundtrip():
    fc = sample_fc()
    raw = json.dumps(fc)
    canonical, digest = geojson_hash_of_str(raw)
    assert digest == geojson_hash(fc)
    assert canonical == canonical_geojson(fc)


def test_invalid_json_raises():
    import pytest

    with pytest.raises(ValueError, match="Invalid JSON"):
        geojson_hash_of_str("{not json")


if __name__ == "__main__":
    import sys

    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except AssertionError as exc:
                failures += 1
                print(f"FAIL {name}: {exc}")
    sys.exit(1 if failures else 0)
