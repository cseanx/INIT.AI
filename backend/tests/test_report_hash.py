"""Tests for the canonical report hashing service.

Runnable with `pytest` or directly: `python -m tests.test_report_hash`.
"""

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models.report import Report  # noqa: E402
from app.services.report_hash import (  # noqa: E402
    attestation_hash,
    canonical_json,
    canonical_report_payload,
)


def make_report(**overrides) -> Report:
    base = dict(
        id=7,
        title="Q3 Urban Heat Island Summary",
        type="Summary",
        status="ready",
        city="Quezon City",
        coverage="Entire city",
        period_start="2026-07-01",
        period_end="2026-07-31",
        prepared_by="Juan Dela Cruz",
        area="Quezon City (All Areas)",
        auto_priority_areas=True,
        datasets=["Surface Temp", "Canopy"],
        areas=[],
        sections=["summary", "charts"],
        recommendations="Expand tree canopy along Katipunan Ave.",
        avg_surface_temp=36.5,
        peak_temp=42.3,
        peak_area="Payatas",
        critical_count=4,
        high_count=9,
        moderate_count=12,
        avg_canopy=18.7,
        mitigation_projects=3,
        generated_at=datetime(2026, 8, 1, 6, 30, tzinfo=timezone.utc),
    )
    base.update(overrides)
    return Report(**base)


def test_hash_is_deterministic():
    report = make_report()
    assert attestation_hash(report) == attestation_hash(report)
    assert len(attestation_hash(report)) == 64


def test_content_change_changes_hash():
    original = attestation_hash(make_report())
    edited = attestation_hash(make_report(recommendations="Amended recommendation."))
    assert original != edited


def test_id_and_created_at_do_not_affect_hash():
    # The proof covers content only; DB identity must not leak into the hash.
    a = make_report(id=1)
    b = make_report(id=999)
    assert attestation_hash(a) == attestation_hash(b)


def test_integral_floats_match_js_serialization():
    # Python float 36.0 must serialize as `36` (like JS numbers), not `36.0`.
    as_float = canonical_json(make_report(avg_surface_temp=36.0))
    as_int = canonical_json(make_report(avg_surface_temp=36))
    assert as_float == as_int


def test_known_vector_matches_manual_sha256():
    payload = canonical_report_payload(make_report())
    manual = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    expected = hashlib.sha256(manual.encode("utf-8")).hexdigest()
    assert attestation_hash(make_report()) == expected
    # Spot-check the compact/sorted shape is really in play:
    assert '"avgSurfaceTemp":36.5' in manual
    assert manual.startswith('{"area":"')


def test_unicode_is_not_escaped():
    report = make_report(prepared_by="Muñoz, José")
    manual = json.dumps(
        canonical_report_payload(report),
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    assert "Muñoz" in manual  # raw UTF-8, like JS JSON.stringify
    # And hashing stays stable for the same unicode content.
    assert attestation_hash(report) == hashlib.sha256(manual.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    import json

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