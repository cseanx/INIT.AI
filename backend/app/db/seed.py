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
    },
    {
        "name": "Maria Santos",
        "email": "analyst@init.ai",
        "password": "analyst123",
        "role": "Climate Analyst",
    },
    {
        "name": "Ramon Reyes",
        "email": "coordinator@init.ai",
        "password": "coordinator123",
        "role": "Field Coordinator",
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
    ("Q3 Urban Heat Island Summary", "Quarterly", "Quezon City (All Districts)", "ready"),
    ("Payatas Priority Zone Deep Dive", "Hotspot Brief", "Payatas", "ready"),
    ("Canopy Loss Assessment 2021–2026", "Canopy", "City-wide", "ready"),
    ("Mitigation Impact Projection", "Mitigation", "6 Priority Barangays", "processing"),
    ("August Satellite Pass Summary", "Monthly", "Quezon City (All Districts)", "processing"),
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
                )
            )
        else:
            user.name = demo["name"]
            user.role = demo["role"]
            user.password_hash = hash_password(demo["password"])
    db.commit()
    print(f"Upserted {len(DEMO_USERS)} demo users with Argon2id password hashes.")

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

    for title, report_type, area, status in REPORTS:
        barangay_id = None
        if area in barangay_by_name:
            barangay_id = barangay_by_name[area].id
        db.add(
            Report(
                title=title,
                type=report_type,
                barangay_id=barangay_id,
                status=status,
            )
        )

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
