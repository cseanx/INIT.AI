# INIT.AI Backend

FastAPI + PostgreSQL backend for the INIT.AI platform, deployed on
**Vercel** (project `backend`, entrypoint `app.main:app`, see `vercel.json`).

## Do I still need to run `uvicorn app.main:app`?

Usually **no**. The production/preview deployment is always live at

```
https://backend-phi-gray-27.vercel.app
```

and the frontend `.env` points straight at it via `VITE_API_URL`, so
`npm run dev` works with zero local backend processes.

A local uvicorn instance is only needed when you want to:

- run Alembic migrations or the seed script against a database,
- debug API behavior locally,
- develop against a throwaway/local PostgreSQL instead of Neon.

To use a local server instead of the hosted one, set `VITE_API_URL=http://localhost:8000`
in the root `.env` (and re-enable the Vite proxy block in `vite.config.ts` if you prefer same-origin calls), then follow the steps below.

## Requirements

- Python 3.12+
- PostgreSQL (local, or a hosted instance such as Neon) — only for local runs

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

## Run locally (optional)

```bash
python -m uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

On startup the app runs `Base.metadata.create_all(engine)` plus an additive
column sync (`app/db/ensure.py`), so a fresh database comes up usable without
a manual migration step. Alembic remains the source of truth for schema history.

## Tests

```bash
pip install pytest httpx2        # dev-only dependencies (not in requirements.txt)
python -m pytest tests -q
```

The suite uses an in-memory SQLite database with auth stubbed out — no
PostgreSQL or network access required.

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

The seed upserts the demo users (fixing password hashes on re-runs) and
inserts domain data only when missing.

### Demo accounts (development only)

| Role                | Email             | Password        |
|---------------------|-------------------|-----------------|
| LGU Administrator   | admin@init.ai     | admin123        |
| Climate Analyst     | analyst@init.ai   | analyst123      |
| Field Coordinator   | coordinator@init.ai | coordinator123 |

Passwords are stored as Argon2id hashes — never in plaintext. These
credentials are for local development only.

## Endpoints

All routes are mounted under `/api`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | /api/auth/login | – | Authenticate, sets an HTTP-only session cookie |
| POST   | /api/auth/logout | – | Invalidates the session and clears the cookie |
| GET    | /api/auth/me | – | Current authenticated user (401 if none) |
| GET    | /api/health | – | Service health check |
| GET    | /api/cities | – | List cities |
| GET    | /api/barangays | – | List barangays (with city name) |
| GET    | /api/heat | – | Heat readings, newest first |
| GET    | /api/canopy | – | Canopy readings, newest first |
| GET    | /api/mitigation | – | Mitigation projects |
| GET    | /api/preferences | ✓ | Get the current user's preferences |
| PUT    | /api/preferences | ✓ | Update the current user's preferences |
| GET    | /api/reports | – | Reports, newest first (incl. attestation summary) |
| GET    | /api/reports/{id} | – | Single report |
| POST   | /api/reports | ✓ | Create a report |
| PUT    | /api/reports/{id} | ✓ | Update a report |
| DELETE | /api/reports/{id} | ✓ | Delete a report |
| GET    | /api/reports/{id}/attestation-message | – | Server-authoritative content hash + canonical payload |
| GET    | /api/reports/{id}/attestation | – | Persisted Stellar proof history |
| POST   | /api/reports/{id}/attestation | ✓ | Record a confirmed on-chain attestation |
| GET    | /api/stellar/attestation/{hash} | – | Public lookup: proof by report hash |

## Project layout

```
app/
├── main.py          # FastAPI app, CORS, router wiring, schema bootstrap
├── core/config.py   # Settings from environment / .env
├── db/              # Engine, session, Base, bootstrap helpers, seed script
├── models/          # SQLAlchemy ORM models
├── schemas/         # Pydantic request/response schemas
├── api/             # Route modules (one per resource)
└── services/        # Report hashing, Horizon verification, query services
alembic/             # Migrations
tests/               # pytest suite (SQLite in-memory)
```

## Frontend integration

The React app talks to this API through `src/services/api.ts`. The base URL
comes from `VITE_API_URL` in the root `.env` — currently the deployed Vercel
URL above, which is why no local server process is needed. Read endpoints
fall back to bundled mock data when the API is unreachable; writes require a
live backend and an authenticated session.

Cross-site cookies: the frontend (`*.vercel.app`) and this API live on
different sites, so the session cookie is issued `SameSite=None; Secure`
(see `app/core/config.py`).

## Notes

- Database credentials live only in `backend/.env` (git-ignored); they are
  never exposed to the frontend.
- Stellar attestation verification is Testnet-only by policy; the expected
  contract id is pinned server-side and Horizon is queried read-only —
  no keys or secrets live in this service.
