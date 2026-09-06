"""Deterministic SHA-256 hashing for GeoJSON (LST layers, boundaries).

Week 2 deliverable: SHA-256 GeoJSON hashing pipeline.

The report attestation hash (`report_hash.py :: attestation_hash`) remains the
authoritative proof for reports — it hashes the canonical ReportPayload, whose
`areas` field is *derived* from GeoJSON layers (e.g. LST FeatureCollection in
`src/components/map/lstData.ts`). This module provides the lower-level
primitive: hash any GeoJSON object deterministically, for layer-data
provenance (future: prove which LST grid a report summary was derived from).

Rules (`initai-canonical-v1`, GeoJSON annex):
  1. Object keys sorted recursively, arrays keep order — EXCEPT coordinates,
     which are rounded to 6 decimals (~11 cm) to absorb float noise across
     languages (Python vs JS `JSON.stringify`).
  2. Compact JSON: no spaces (`separators=(',', ':')`), raw UTF-8
     (`ensure_ascii=False`).
  3. Integral floats normalized to ints (`36.0` -> `36`), matching JS numbers.
     Non-integral floats rounded to 6 decimals, trailing zeros stripped by
     JSON encoding (e.g. `121.180000` -> `121.18`).
  4. Digest = SHA-256 over exact UTF-8 bytes, 64 lowercase hex.

Only stdlib: hashlib + json.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


_COORD_PRECISION = 6


def _round_coord(value: float | int) -> float | int:
    """Round a coordinate number to 6 decimals; ints stay ints."""
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if value.is_integer():
            return int(value)
        return round(value, _COORD_PRECISION)
    return value


def _normalize(obj: Any, *, in_coordinates: bool = False) -> Any:
    """Recursively normalize a GeoJSON-decoded object.

    `in_coordinates` is True when walking inside a `coordinates` array, where
    every number is a coordinate and gets rounded. Elsewhere numbers follow
    the report-hash rule (integral floats -> ints, others untouched).
    """
    if isinstance(obj, dict):
        # Detect coordinates arrays: key == "coordinates"
        normalized: dict[str, Any] = {}
        for key in sorted(obj.keys()):
            val = obj[key]
            if key == "coordinates":
                normalized[key] = _normalize_coords(val)
            elif key == "bbox":
                normalized[key] = _normalize_coords(val)
            else:
                normalized[key] = _normalize(val, in_coordinates=False)
        return normalized
    if isinstance(obj, list):
        # Generic list (e.g. features): keep order, normalize each element.
        # Note: bare coordinate rings are handled by _normalize_coords, not here.
        return [_normalize(item, in_coordinates=in_coordinates) for item in obj]
    if isinstance(obj, float):
        if obj.is_integer():
            return int(obj)
        return obj
    return obj


def _normalize_coords(obj: Any) -> Any:
    """Normalize a coordinates/bbox nested array: round every number to 6dp."""
    if isinstance(obj, list):
        return [_normalize_coords(item) for item in obj]
    if isinstance(obj, bool):
        return obj
    if isinstance(obj, int):
        return obj
    if isinstance(obj, float):
        if obj.is_integer():
            # Coordinates like 121.0 -> 121 (matches JS `121`)
            return int(obj)
        return round(obj, _COORD_PRECISION)
    return obj


def canonical_geojson(obj: Any) -> str:
    """Compact, sorted-key JSON for a GeoJSON object — byte-stable."""
    normalized = _normalize(obj)
    return json.dumps(
        normalized,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def geojson_hash(obj: Any) -> str:
    """64-char lowercase hex SHA-256 of the canonical GeoJSON."""
    return hashlib.sha256(canonical_geojson(obj).encode("utf-8")).hexdigest()


def geojson_hash_of_str(raw_json: str) -> tuple[str, str]:
    """Hash a raw JSON string: parse -> canonicalize -> hash.

    Returns (canonical_json, hash). Raises ValueError on invalid JSON.
    """
    try:
        obj = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON: {exc}") from exc
    canonical = canonical_geojson(obj)
    return canonical, hashlib.sha256(canonical.encode("utf-8")).hexdigest()
