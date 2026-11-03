"""Seed the database with INIT.AI MIMAROPA demo data.

Demo users are upserted on every run (so existing databases get proper
password hashes); domain data is only inserted when missing.

Usage (from the backend/ directory):
    python -m app.db.seed
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Barangay, CanopyData, City, HeatData, MitigationProject, Report, User
from app.services.auth import hash_password

# Demo accounts for all three roles. Passwords are hashed with Argon2id
# at seed time — never stored in plaintext. Documented in backend/README.md.
DEMO_USERS = [
    {
        "name": "Juan Dela Cruz",
        "email": "admin@init.ai",
        "password": "admin123",
        "role": "LGU Administrator",
        "organization": "MIMAROPA Regional Office",
    },
    {
        "name": "Maria Santos",
        "email": "analyst@init.ai",
        "password": "analyst123",
        "role": "Climate Analyst",
        "organization": "MIMAROPA Climate Analytics",
    },
    {
        "name": "Ramon Reyes",
        "email": "coordinator@init.ai",
        "password": "coordinator123",
        "role": "Field Coordinator",
        "organization": "MIMAROPA Field Operations",
    },
]

# One pilot city/municipality per MIMAROPA province.
CITIES = [
    ("Calapan City", "Oriental Mindoro"),
    ("Mamburao", "Occidental Mindoro"),
    ("Boac", "Marinduque"),
    ("Romblon", "Romblon"),
    ("Puerto Princesa City", "Palawan"),
]

# (name, temp, canopy_pct) — mirrors the frontend prototype mock data.
BARANGAYS: dict[str, list[tuple[str, float, float]]] = {
    "Calapan City": [
        ("Poblacion", 38.6, 12.0),
        ("Camilmil", 37.4, 16.0),
        ("San Vicente", 36.2, 22.0),
        ("San Antonio", 35.1, 28.0),
        ("Guinobatan", 34.3, 34.0),
    ],
    "Mamburao": [
        ("Poblacion", 36.8, 18.0),
        ("Payompon", 35.9, 24.0),
        ("Balansay", 35.3, 29.0),
        ("Talabaan", 34.8, 31.0),
        ("Santa Maria", 34.1, 36.0),
    ],
    "Boac": [
        ("Poblacion", 35.8, 20.0),
        ("San Miguel", 35.1, 26.0),
        ("Laylay", 34.7, 30.0),
        ("Tampus", 34.2, 35.0),
        ("Bantad", 33.8, 41.0),
    ],
    "Romblon": [
        ("Poblacion", 35.5, 21.0),
        ("Cahayag", 34.9, 27.0),
        ("Cobrador", 33.9, 38.0),
        ("Ilauran", 34.5, 32.0),
        ("Macalas", 33.7, 44.0),
    ],
    "Puerto Princesa City": [
        ("San Pedro", 39.2, 10.0),
        ("San Jose", 38.4, 13.0),
        ("Tanglaw", 37.2, 17.0),
        ("Model", 36.1, 23.0),
        ("Mabuhay", 35.3, 30.0),
    ],
}

MITIGATION_PROJECTS = [
    (
        "Calapan City",
        "Poblacion",
        "Urban Tree Planting",
        "Fast-canopy native species along Poblacion and Camilmil arterials in Calapan City.",
        "Proposed",
    ),
    (
        "Puerto Princesa City",
        "San Pedro",
        "Cool / Reflective Roofing",
        "Retrofit high-density rooftops in San Pedro and San Jose with reflective coating.",
        "In Progress",
    ),
    (
        "Boac",
        "Poblacion",
        "Green Corridors & Pocket Parks",
        "Convert underused lots around Boac's heritage core into shaded pocket parks.",
        "Proposed",
    ),
    (
        "Romblon",
        "Poblacion",
        "Permeable Pavements",
        "Replace impervious pavement in Romblon's port district flood-heat overlap zones.",
        "Planned",
    ),
]

REPORTS = [
    {
        "title": "MIMAROPA Q3 Urban Heat Summary",
        "type": "Quarterly",
        "area": "MIMAROPA (All Provinces)",
        "city": "MIMAROPA",
        "coverage": "Entire region",
        "period_start": "2026-07-01",
        "period_end": "2026-07-31",
        "prepared_by": "Juan Dela Cruz",
        "auto_priority_areas": False,
        "datasets": ["lst", "hotspots", "trends"],
        "areas": ["Poblacion (Calapan City)", "San Pedro (Puerto Princesa City)", "Poblacion (Boac)"],
        "sections": ["summary", "heat", "hotspots", "charts", "methodology"],
        "recommendations": "Prioritize urban tree planting in Calapan City, Puerto Princesa City and Boac.",
        "avg_surface_temp": 35.6, "peak_temp": 39.2, "peak_area": "San Pedro",
        "critical_count": 2, "high_count": 8, "moderate_count": 15,
        "avg_canopy": 26.3, "mitigation_projects": 4,
    },
    {
        "title": "San Pedro Priority Zone Deep Dive",
        "type": "Hotspot Brief",
        "area": "San Pedro, Puerto Princesa City",
        "city": "Puerto Princesa City",
        "coverage": "Barangay",
        "period_start": "2026-06-01",
        "period_end": "2026-06-30",
        "prepared_by": "Maria Santos",
        "auto_priority_areas": False,
        "datasets": ["lst", "hotspots", "canopy"],
        "areas": ["San Pedro"],
        "sections": ["summary", "hotspots", "canopy", "mitigation"],
        "recommendations": "Fast-track tree planting along the San Pedro commercial core.",
        "avg_surface_temp": 37.8, "peak_temp": 39.2, "peak_area": "San Pedro",
        "critical_count": 1, "high_count": 2, "moderate_count": 2,
        "avg_canopy": 18.6, "mitigation_projects": 1,
    },
    {
        "title": "MIMAROPA Canopy Loss Assessment 2021\u20132026",
        "type": "Canopy",
        "area": "Region-wide",
        "city": "MIMAROPA",
        "coverage": "Entire region",
        "period_start": "2021-01-01",
        "period_end": "2025-12-31",
        "prepared_by": "Maria Santos",
        "auto_priority_areas": False,
        "datasets": ["canopy", "landcover"],
        "areas": [],
        "sections": ["summary", "canopy", "maps", "charts", "methodology", "sources"],
        "recommendations": "Address canopy deficits in the priority barangays of Calapan and Puerto Princesa.",
        "avg_surface_temp": 35.6, "peak_temp": 39.2, "peak_area": "San Pedro",
        "critical_count": 2, "high_count": 8, "moderate_count": 15,
        "avg_canopy": 26.3, "mitigation_projects": 4,
    },
    {
        "title": "Mitigation Impact Projection",
        "type": "Mitigation",
        "area": "8 Priority Barangays",
        "city": "MIMAROPA",
        "coverage": "Entire region",
        "period_start": "2026-01-01",
        "period_end": "2026-12-31",
        "prepared_by": "Ramon Reyes",
        "auto_priority_areas": True,
        "datasets": ["lst", "hotspots", "mitigation"],
        "areas": [],
        "sections": ["summary", "mitigation", "charts"],
        "recommendations": "",
        "avg_surface_temp": 35.6, "peak_temp": 39.2, "peak_area": "San Pedro",
        "critical_count": 2, "high_count": 8, "moderate_count": 15,
        "avg_canopy": 26.3, "mitigation_projects": 4,
    },
    {
        "title": "August Satellite Pass Summary",
        "type": "Monthly",
        "area": "MIMAROPA (All Provinces)",
        "city": "MIMAROPA",
        "coverage": "Entire region",
        "period_start": "2026-08-01",
        "period_end": "2026-08-31",
        "prepared_by": "Juan Dela Cruz",
        "auto_priority_areas": False,
        "datasets": ["lst", "trends"],
        "areas": [],
        "sections": ["summary", "heat", "charts", "sources"],
        "recommendations": "",
        "avg_surface_temp": 35.6, "peak_temp": 39.2, "peak_area": "San Pedro",
        "critical_count": 2, "high_count": 8, "moderate_count": 15,
        "avg_canopy": 26.3, "mitigation_projects": 4,
    },
]


def seed(db: Session) -> None:
    # Demo users are upserted on every run so existing databases (e.g. one
    # seeded before authentication existed) get proper Argon2id hashes.
    for demo in DEMO_USERS:
        user = db.scalar(select(User).where(User.email == demo["email"]))
        if user is None:
            db.add(
                User(
                    name=demo["name"],
                    email=demo["email"],
                    password_hash=hash_password(demo["password"]),
                    role=demo["role"],
                    organization=demo.get("organization"),
                    email_verified=True,
                )
            )
        else:
            user.name = demo["name"]
            user.role = demo["role"]
            user.organization = demo.get("organization", user.organization)
            user.email_verified = True
            user.password_hash = hash_password(demo["password"])
    db.commit()
    print(f"Upserted {len(DEMO_USERS)} demo users with Argon2id password hashes (verified).")

    if db.scalar(select(func.count()).select_from(Barangay)):
        print("Domain data already present — skipping.")
        return

    city_by_name: dict[str, City] = {}
    for city_name, region in CITIES:
        city = City(name=city_name, region=region)
        db.add(city)
        db.flush()
        city_by_name[city_name] = city

    barangay_by_key: dict[tuple[str, str], Barangay] = {}
    for city_name, entries in BARANGAYS.items():
        city = city_by_name[city_name]
        for name, _temp, _canopy_pct in entries:
            barangay = Barangay(city_id=city.id, name=name)
            db.add(barangay)
            barangay_by_key[(city_name, name)] = barangay
    db.flush()

    for city_name, entries in BARANGAYS.items():
        for name, temp, canopy_pct in entries:
            barangay = barangay_by_key[(city_name, name)]
            db.add(HeatData(barangay_id=barangay.id, temperature=temp))
            db.add(CanopyData(barangay_id=barangay.id, canopy_percentage=canopy_pct))

    for city_name, barangay_name, title, description, status in MITIGATION_PROJECTS:
        db.add(
            MitigationProject(
                barangay_id=barangay_by_key[(city_name, barangay_name)].id,
                title=title,
                description=description,
                status=status,
            )
        )

    for report_data in REPORTS:
        db.add(Report(status="ready", **report_data))

    db.commit()
    print(
        f"Seeded: {len(CITIES)} cities, {sum(len(rows) for rows in BARANGAYS.values())} "
        f"barangays, heat+canopy readings, {len(MITIGATION_PROJECTS)} mitigation projects, "
        f"{len(REPORTS)} reports."
    )


if __name__ == "__main__":
    # Requires an up-to-date schema: run `alembic upgrade head` first.
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
