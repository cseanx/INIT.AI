"""Seed the database with INIT.AI demo data.

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
        "organization": "Quezon City Local Government",
    },
    {
        "name": "Maria Santos",
        "email": "analyst@init.ai",
        "password": "analyst123",
        "role": "Climate Analyst",
        "organization": "Quezon City LGU — Climate Division",
    },
    {
        "name": "Ramon Reyes",
        "email": "coordinator@init.ai",
        "password": "coordinator123",
        "role": "Field Coordinator",
        "organization": "Quezon City LGU — Field Operations",
    },
]

# (name, temp, canopy_pct, driver) — mirrors the frontend prototype mock data
BARANGAYS = [
    ("Payatas", 41.2, 12.0),
    ("Batasan Hills", 38.9, 16.0),
    ("Cubao (Commercial)", 38.1, 9.0),
    ("Novaliches Proper", 36.4, 21.0),
    ("Fairview", 35.8, 24.0),
    ("Commonwealth", 37.6, 18.0),
    ("Diliman", 33.1, 38.0),
    ("Project 6", 36.9, 19.0),
    ("Bagong Silangan", 37.9, 15.0),
    ("Holy Spirit", 35.2, 22.0),
    ("Tandang Sora", 34.4, 27.0),
    ("UP Campus", 30.6, 52.0),
    ("Kamuning", 37.1, 14.0),
    ("San Bartolome", 36.1, 20.0),
    ("Sauyo", 34.9, 26.0),
    ("Pasong Tamo", 39.4, 11.0),
    ("Talipapa", 38.6, 13.0),
]

MITIGATION_PROJECTS = [
    ("Payatas", "Urban Tree Planting", "Fast-canopy native species along arterial roads in Payatas and Batasan Hills.", "Proposed"),
    ("Cubao (Commercial)", "Cool / Reflective Roofing", "Retrofit high-density residential rooftops in Cubao with reflective coating.", "In Progress"),
    ("Commonwealth", "Green Corridors & Pocket Parks", "Convert underused lots along Commonwealth Ave into shaded pocket parks.", "Proposed"),
    ("Novaliches Proper", "Permeable Pavements", "Replace impervious pavement in Novaliches Proper flood-heat overlap zones.", "Planned"),
]

REPORTS = [
    {
        "title": "Q3 Urban Heat Island Summary",
        "type": "Quarterly",
        "area": "Quezon City (All Areas)",
        "city": "Quezon City",
        "coverage": "Entire city",
        "period_start": "2026-07-01",
        "period_end": "2026-07-31",
        "prepared_by": "Juan Dela Cruz",
        "auto_priority_areas": False,
        "datasets": ["lst", "hotspots", "trends"],
        "areas": ["Payatas", "Batasan Hills", "Commonwealth"],
        "sections": ["summary", "heat", "hotspots", "charts", "methodology"],
        "recommendations": "Prioritize urban tree planting in Payatas, Batasan Hills and Commonwealth.",
        "avg_surface_temp": 36.5, "peak_temp": 41.2, "peak_area": "Payatas",
        "critical_count": 2, "high_count": 4, "moderate_count": 7,
        "avg_canopy": 21.8, "mitigation_projects": 4,
    },
    {
        "title": "Payatas Priority Zone Deep Dive",
        "type": "Hotspot Brief",
        "area": "Payatas",
        "city": "Quezon City",
        "coverage": "Barangay",
        "period_start": "2026-06-01",
        "period_end": "2026-06-30",
        "prepared_by": "Maria Santos",
        "auto_priority_areas": False,
        "datasets": ["lst", "hotspots", "canopy"],
        "areas": ["Payatas"],
        "sections": ["summary", "hotspots", "canopy", "mitigation"],
        "recommendations": "Fast-track tree planting along arterial roads in Payatas.",
        "avg_surface_temp": 38.2, "peak_temp": 41.2, "peak_area": "Payatas",
        "critical_count": 1, "high_count": 1, "moderate_count": 2,
        "avg_canopy": 12.0, "mitigation_projects": 1,
    },
    {
        "title": "Canopy Loss Assessment 2021\u20132026",
        "type": "Canopy",
        "area": "City-wide",
        "city": "Quezon City",
        "coverage": "Entire city",
        "period_start": "2021-01-01",
        "period_end": "2025-12-31",
        "prepared_by": "Maria Santos",
        "auto_priority_areas": False,
        "datasets": ["canopy", "landcover"],
        "areas": [],
        "sections": ["summary", "canopy", "maps", "charts", "methodology", "sources"],
        "recommendations": "Address canopy deficits in low-cover barangays.",
        "avg_surface_temp": 36.5, "peak_temp": 41.2, "peak_area": "Payatas",
        "critical_count": 2, "high_count": 4, "moderate_count": 7,
        "avg_canopy": 21.8, "mitigation_projects": 4,
    },
    {
        "title": "Mitigation Impact Projection",
        "type": "Mitigation",
        "area": "6 Priority Barangays",
        "city": "Quezon City",
        "coverage": "District",
        "period_start": "2026-01-01",
        "period_end": "2026-12-31",
        "prepared_by": "Ramon Reyes",
        "auto_priority_areas": True,
        "datasets": ["lst", "hotspots", "mitigation"],
        "areas": [],
        "sections": ["summary", "mitigation", "charts"],
        "recommendations": "",
        "avg_surface_temp": 36.5, "peak_temp": 41.2, "peak_area": "Payatas",
        "critical_count": 2, "high_count": 4, "moderate_count": 7,
        "avg_canopy": 21.8, "mitigation_projects": 4,
    },
    {
        "title": "August Satellite Pass Summary",
        "type": "Monthly",
        "area": "Quezon City (All Areas)",
        "city": "Quezon City",
        "coverage": "Entire city",
        "period_start": "2026-08-01",
        "period_end": "2026-08-31",
        "prepared_by": "Juan Dela Cruz",
        "auto_priority_areas": False,
        "datasets": ["lst", "trends"],
        "areas": [],
        "sections": ["summary", "heat", "charts", "sources"],
        "recommendations": "",
        "avg_surface_temp": 36.5, "peak_temp": 41.2, "peak_area": "Payatas",
        "critical_count": 2, "high_count": 4, "moderate_count": 7,
        "avg_canopy": 21.8, "mitigation_projects": 4,
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

    city = City(name="Quezon City", region="NCR")
    db.add(city)
    db.flush()

    barangay_by_name: dict[str, Barangay] = {}
    for name, temp, canopy_pct in BARANGAYS:
        barangay = Barangay(city_id=city.id, name=name)
        db.add(barangay)
        barangay_by_name[name] = barangay
    db.flush()

    for name, temp, canopy_pct in BARANGAYS:
        barangay = barangay_by_name[name]
        db.add(HeatData(barangay_id=barangay.id, temperature=temp))
        db.add(CanopyData(barangay_id=barangay.id, canopy_percentage=canopy_pct))

    for barangay_name, title, description, status in MITIGATION_PROJECTS:
        db.add(
            MitigationProject(
                barangay_id=barangay_by_name[barangay_name].id,
                title=title,
                description=description,
                status=status,
            )
        )

    for report_data in REPORTS:
        barangay_id = None
        if report_data["area"] in barangay_by_name:
            barangay_id = barangay_by_name[report_data["area"]].id
        db.add(Report(status="ready", barangay_id=barangay_id, **report_data))

    db.commit()
    print(
        f"Seeded: 1 city, {len(BARANGAYS)} barangays, heat+canopy readings, "
        f"{len(MITIGATION_PROJECTS)} mitigation projects, {len(REPORTS)} reports."
    )


if __name__ == "__main__":
    # Requires an up-to-date schema: run `alembic upgrade head` first.
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
