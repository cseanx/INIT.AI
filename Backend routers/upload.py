"""
Upload router — /upload
Handles satellite data file ingestion (GeoTIFF, CSV, XLSX, NetCDF).
"""
import os
import uuid
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException

from models.orm import Profile
from models.schemas import UploadResponse
from utils.auth import require_planner

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".tif", ".tiff", ".csv", ".xlsx", ".nc", ".shp", ".zip", ".json", ".geojson"}
MAX_FILE_SIZE_MB = 500

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/initai_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=UploadResponse, summary="Upload satellite or survey data file [Planner/Admin]")
async def upload_file(
    file: UploadFile = File(...),
    data_type: str = Form(...),
    city_name: Optional[str] = Form(None),
    current_user: Profile = Depends(require_planner),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f}MB). Max: {MAX_FILE_SIZE_MB}MB",
        )

    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    # Determine record count for tabular data
    records_found = None
    if ext == ".csv":
        try:
            records_found = contents.decode("utf-8", errors="ignore").count("\n") - 1
        except Exception:
            pass

    logger.info(f"File uploaded: {file.filename} ({size_mb:.1f}MB) by {current_user.email}")

    return UploadResponse(
        file_id=file_id,
        filename=file.filename,
        size_bytes=len(contents),
        data_type=data_type,
        status="processed",
        records_found=records_found,
        preview_url=f"/upload/preview/{file_id}",
        created_at=datetime.utcnow(),
    )


@router.get("/history", summary="List recent upload history")
async def upload_history(
    current_user: Profile = Depends(require_planner),
):
    """In production, this queries an `uploads` table. Returns mock for prototype."""
    return {
        "uploads": [
            {"name": "QC_Landsat9_20250526.tif", "size": "142 MB", "type": "GeoTIFF",
             "status": "processed", "date": "2025-05-26", "records": 1, "band": "TIRS Band 10"},
            {"name": "NDVI_Sentinel2_May2025.csv", "size": "2.4 MB", "type": "CSV",
             "status": "processed", "date": "2025-05-20", "records": 18420, "band": "B4/B8"},
            {"name": "GroundTruth_Survey_May.xlsx", "size": "84 KB", "type": "XLSX",
             "status": "processed", "date": "2025-05-18", "records": 42, "band": "—"},
        ]
    }


@router.get("/pipeline-status/{file_id}", summary="Check processing pipeline status")
async def pipeline_status(
    file_id: str,
    _: Profile = Depends(require_planner),
):
    return {
        "file_id": file_id,
        "stages": [
            {"stage": "File Validation",        "status": "done"},
            {"stage": "Atmospheric Correction",  "status": "done"},
            {"stage": "Georeferencing",          "status": "done"},
            {"stage": "Band Calculation",        "status": "active"},
            {"stage": "Hotspot Detection",       "status": "pending"},
            {"stage": "Database Ingest",         "status": "pending"},
        ],
    }
