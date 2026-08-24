"""Authoritative canonical report hashing for Stellar attestations.

The canonical payload mirrors the frontend's `ReportPayload` (see
`src/reports/reportService.ts :: buildReportPayload`) key-for-key, built from
the stored database row. The hash is:

    SHA-256( json.dumps(payload, sort_keys=True, separators=(',',':'),
                          ensure_ascii=False) )

matching the browser's `JSON.stringify`-style compact output, so the same
logical report always produces the same 64-hex digest. Report `id` and DB
timestamps are deliberately excluded — the proof covers report CONTENT only.
"""

import hashlib
import json
from datetime import datetime
from typing import Any

from app.models.report import Report


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _num(value: float | int | None) -> float | int | None:
    """Normalize integral floats to ints so Python's `36.0` serializes like
    JavaScript's `36`. Non-integral doubles serialize identically in both."""
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def canonical_report_payload(report: Report) -> dict[str, Any]:
    """The exact field set of the frontend ReportPayload, from the DB row."""
    return {
        "title": report.title,
        "type": report.type,
        "status": report.status,
        "area": report.area,
        "city": report.city,
        "coverage": report.coverage,
        "periodStart": report.period_start,
        "periodEnd": report.period_end,
        "preparedBy": report.prepared_by,
        "autoPriorityAreas": bool(report.auto_priority_areas),
        "datasets": list(report.datasets or []),
        "areas": list(report.areas or []),
        "sections": list(report.sections or []),
        "recommendations": report.recommendations or "",
        "avgSurfaceTemp": _num(report.avg_surface_temp),
        "peakTemp": _num(report.peak_temp),
        "peakArea": report.peak_area,
        "criticalCount": report.critical_count,
        "highCount": report.high_count,
        "moderateCount": report.moderate_count,
        "avgCanopy": _num(report.avg_canopy),
        "mitigationProjects": report.mitigation_projects,
        "generatedAt": _iso(report.generated_at),
    }


def canonical_json(report: Report) -> str:
    """Compact, sorted-key JSON — byte-stable across runs and languages."""
    return json.dumps(
        canonical_report_payload(report),
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def attestation_hash(report: Report) -> str:
    """64-char lowercase hex SHA-256 of the canonical JSON."""
    return hashlib.sha256(canonical_json(report).encode("utf-8")).hexdigest()