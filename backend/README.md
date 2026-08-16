# INIT.AI Backend

FastAPI + PostgreSQL backend for the INIT.AI platform.

## Requirements

- Python 3.12+
- PostgreSQL (local, or a hosted instance such as Neon)

## Setup

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and set DATABASE_URL (Neon connection string or local Postgres)
```

## Run

```bash
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

## Migrations (Alembic)

```bash
alembic upgrade head      # apply migrations
alembic revision --autogenerate -m "describe change"   # new migration
alembic downgrade -1      # roll back one step
```

## Seed demo data

Requires an up-to-date schema (`alembic upgrade head` first):

```bash
python -m app.db.seed
```

The seed is idempotent — it skips when data already exists.

## Endpoints

| Method | Path              | Description                              |
|--------|-------------------|------------------------------------------|
| GET    | /api/health       | Service health check                     |
| GET    | /api/cities       | List cities                              |
| GET    | /api/barangays    | List barangays (with city name)          |
| GET    | /api/heat         | Heat readings, newest first              |
| GET    | /api/canopy       | Canopy readings, newest first            |
| GET    | /api/mitigation   | Mitigation projects                      |
| GET    | /api/reports      | Generated reports                        |

## Project layout

```
app/
├── main.py          # FastAPI app, CORS, router wiring
├── core/config.py   # Settings from environment / .env
├── db/              # Engine, session, Base, seed script
├── models/          # SQLAlchemy ORM models
├── schemas/         # Pydantic response schemas
├── api/             # Route modules (one per resource)
└── services/        # Shared query services
alembic/             # Migrations
```

## Frontend integration

The React app calls these endpoints through `src/services/api.ts`, with
`VITE_API_URL` (e.g. `http://localhost:8000`) set in the frontend `.env`.
Until a full response mapping is wired up, the frontend gracefully falls
back to its local mock data when the API is unreachable.

## Notes

- Authentication is intentionally not implemented yet (Phase 2 is schema +
  read endpoints only).
- Database credentials live only in `backend/.env` (git-ignored); they are
  never exposed to the frontend.
