"""
INIT.AI — FastAPI Backend
Urban Heat Island Mapping Platform · Philippines
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import os

# ─── Routers ──────────────────────────────────────────────────
from routers import (
    auth,
    thermal,
    hotspots,
    ndvi,
    barangay,
    forecast,
    actions,
    alerts,
    reports,
    satellite,
    cities,
    surveys,
    notifications,
    upload,
)
from models.database import engine, Base

# ─── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("initai")


# ─── Lifespan (startup / shutdown) ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🌡  INIT.AI Backend starting up...")
    # Create tables if not using Supabase migrations
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables verified")

    # Initialize GEE if credentials are available
    gee_key = os.getenv("GEE_KEY_FILE")
    if gee_key and os.path.exists(gee_key):
        try:
            import ee
            credentials = ee.ServiceAccountCredentials(
                os.getenv("GEE_SERVICE_ACCOUNT"), gee_key
            )
            ee.Initialize(credentials)
            logger.info("✅ Google Earth Engine initialized")
        except Exception as e:
            logger.warning(f"⚠️  GEE not available: {e} — using cached data")
    else:
        logger.warning("⚠️  GEE credentials not found — using mock satellite data")

    yield  # App runs here

    logger.info("👋 INIT.AI Backend shutting down...")


# ─── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="INIT.AI API",
    description="""
## INIT.AI — Urban Heat Island Mapping Platform

REST API for the INIT.AI urban thermal intelligence platform serving
Philippine Local Government Units (LGUs).

### Features
- **Thermal Analysis** — Land Surface Temperature from Landsat-9 + Sentinel-3
- **NDVI** — Vegetation index computation from Sentinel-2
- **Hotspot Registry** — Spatial CRUD with PostGIS
- **AI Forecasting** — Prophet + sklearn temperature predictions
- **LGU Action Tracker** — Green infrastructure project management
- **Alerts** — Threshold-based notification engine

### Authentication
All endpoints (except `/health`) require Bearer JWT token from Supabase Auth.
""",
    version="2.4.1",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ─── Middleware ────────────────────────────────────────────────
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response


# ─── Exception Handlers ───────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


# ─── Health Check ─────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """Public health check endpoint — no auth required."""
    return {
        "status": "healthy",
        "version": "2.4.1",
        "platform": "INIT.AI Urban Heat Island System",
        "country": "Philippines",
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "INIT.AI API — Urban Heat Island Platform",
        "docs": "/docs",
        "version": "2.4.1",
    }


# ─── Register Routers ─────────────────────────────────────────
app.include_router(auth.router,          prefix="/auth",          tags=["Auth"])
app.include_router(cities.router,        prefix="/cities",        tags=["Cities"])
app.include_router(thermal.router,       prefix="/thermal",       tags=["Thermal"])
app.include_router(hotspots.router,      prefix="/hotspots",      tags=["Hotspots"])
app.include_router(ndvi.router,          prefix="/ndvi",          tags=["NDVI"])
app.include_router(barangay.router,      prefix="/barangays",     tags=["Barangay"])
app.include_router(forecast.router,      prefix="/forecast",      tags=["Forecast"])
app.include_router(actions.router,       prefix="/actions",       tags=["LGU Actions"])
app.include_router(alerts.router,        prefix="/alerts",        tags=["Alerts"])
app.include_router(surveys.router,       prefix="/surveys",       tags=["Surveys"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(reports.router,       prefix="/reports",       tags=["Reports"])
app.include_router(satellite.router,     prefix="/satellite",     tags=["Satellite"])
app.include_router(upload.router,        prefix="/upload",        tags=["Data Upload"])
