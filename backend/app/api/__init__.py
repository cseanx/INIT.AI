from app.api.account import router as account_router
from app.api.auth import router as auth_router
from app.api.barangays import router as barangays_router
from app.api.canopy import router as canopy_router
from app.api.cities import router as cities_router
from app.api.heat import router as heat_router
from app.api.layers import router as layers_router
from app.api.mitigation import router as mitigation_router
from app.api.preferences import router as preferences_router
from app.api.reports import router as reports_router
from app.api.stellar import router as stellar_router

api_routers = [
    auth_router,
    account_router,
    layers_router,
    cities_router,
    barangays_router,
    heat_router,
    canopy_router,
    mitigation_router,
    preferences_router,
    reports_router,
    stellar_router,
]

__all__ = ["api_routers"]
