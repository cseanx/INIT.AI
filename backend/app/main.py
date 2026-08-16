from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_routers
from app.core.config import settings

app = FastAPI(title="INIT.AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


for router in api_routers:
    app.include_router(router, prefix="/api")
