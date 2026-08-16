from app.api.barangays import router as barangays_router
from app.api.canopy import router as canopy_router
from app.api.cities import router as cities_router
from app.api.heat import router as heat_router
from app.api.mitigation import router as mitigation_router
from app.api.reports import router as reports_router

api_routers = [
    cities_router,
    barangays_router,
    heat_router,
    canopy_router,
    mitigation_router,
    reports_router,
]

__all__ = ["api_routers"]
