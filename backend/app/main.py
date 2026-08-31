from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_routers
from app.core.config import settings
from app.db.base import Base
from app.db.ensure import ensure_attestation_columns, ensure_report_columns
from app.db.session import engine

# Ensure every table the app needs exists in the configured database.
# create_all is idempotent — it only creates tables that are missing — so
# fresh deployments (e.g. a newly provisioned database) come up without
# requiring a manual migration step.
Base.metadata.create_all(engine)
# Additive column sync for tables that already exist in older databases.
ensure_report_columns(engine)
ensure_attestation_columns(engine)

app = FastAPI(title="INIT.AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


for router in api_routers:
    app.include_router(router, prefix="/api")
