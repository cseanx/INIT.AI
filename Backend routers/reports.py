"""
Reports router — /reports
PDF/XLSX generation for LGU briefings.
"""
from typing import Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.database import get_db
from models.orm import Profile, City, Hotspot
from models.schemas import ReportRequest
from utils.auth import get_current_active_user
from services.report_generator import report_generator

router = APIRouter()


EXECUTIVE_SUMMARIES = {
    "Quezon City": (
        "Quezon City continues to exhibit critical urban heat island intensity, with the "
        "Kamuning-Cubao corridor showing sustained surface temperatures above 39°C. "
        "Tree canopy coverage remains below the 30% LGU target at 18.3%. Twelve active "
        "hotspot zones have been identified through Landsat-9 and Sentinel-3 satellite "
        "monitoring, with four classified as critical priority for immediate intervention."
    ),
}


@router.post("/generate", summary="Generate a new report (PDF or XLSX)")
async def generate_report(
    payload: ReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_active_user),
):
    city_res = await db.execute(select(City).where(City.id == payload.city_id))
    city = city_res.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    hotspot_res = await db.execute(
        select(Hotspot).where(Hotspot.city_id == city.id, Hotspot.is_active == True)
        .order_by(Hotspot.lst.desc())
    )
    hotspots = hotspot_res.scalars().all()

    report_data = {
        "title": _report_title(payload.report_type),
        "city_name": city.name,
        "data_period": payload.date_from.strftime("%B %Y") if payload.date_from else "Latest",
        "avg_lst": float(city.avg_lst or 38.4),
        "hotspot_count": city.hotspot_count or len(hotspots),
        "canopy_pct": float(city.canopy_pct or 18.3),
        "uhi_intensity": float(city.uhi_intensity or 4.8),
        "executive_summary": EXECUTIVE_SUMMARIES.get(
            city.name,
            f"{city.name} thermal assessment shows {len(hotspots)} active heat hotspots "
            f"requiring LGU attention and mitigation planning."
        ),
        "hotspots": [
            {
                "zone_id": h.zone_id,
                "barangay_name": h.barangay_name,
                "lst": float(h.lst),
                "severity": h.severity,
                "ndvi": float(h.ndvi) if h.ndvi else 0,
                "cause": h.cause,
                "satellite": h.satellite,
            } for h in hotspots
        ],
        "mitigations": [
            {
                "title": "Urban Reforestation Program",
                "description": "Plant native trees in zero-canopy zones to reduce surface temperature.",
                "impact": "-3.2°C", "cost": "₱18.4M", "timeline": "18 months",
            },
            {
                "title": "Cool Pavement Initiative",
                "description": "Replace dark asphalt with reflective permeable paving materials.",
                "impact": "-1.8°C", "cost": "₱42.1M", "timeline": "24 months",
            },
        ],
    }

    if payload.format == "xlsx":
        file_bytes = report_generator.generate_xlsx(report_data)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"INITAI_{city.name.replace(' ','_')}_{payload.report_type}.xlsx"
    else:
        file_bytes = report_generator.generate_pdf(report_data)
        media_type = "application/pdf"
        filename = f"INITAI_{city.name.replace(' ','_')}_{payload.report_type}.pdf"

    if file_bytes is None:
        raise HTTPException(status_code=500, detail="Report generation failed")

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/archive/{city_name}", summary="List previously generated reports")
async def report_archive(
    city_name: str,
    _: Profile = Depends(get_current_active_user),
):
    """Returns the report archive list. In production this queries Supabase Storage."""
    return {
        "city_name": city_name,
        "reports": [
            {"title": "Monthly UHI Assessment — May 2025", "type": "PDF", "size_mb": 4.2, "generated_at": "2025-06-01"},
            {"title": "NDVI Change Detection — Q1 2025",   "type": "PDF", "size_mb": 2.8, "generated_at": "2025-04-03"},
            {"title": "Mitigation ROI Analysis",            "type": "XLSX","size_mb": 1.1, "generated_at": "2025-05-15"},
            {"title": "Hotspot Registry Export",            "type": "CSV", "size_mb": 0.08,"generated_at": "2025-06-01"},
        ],
    }


def _report_title(report_type: str) -> str:
    titles = {
        "monthly_uhi": "Monthly Urban Heat Island Assessment",
        "ndvi_change": "NDVI Change Detection Report",
        "roi_analysis": "Mitigation ROI Analysis",
        "executive_brief": "Executive Briefing Summary",
    }
    return titles.get(report_type, "UHI Assessment Report")
