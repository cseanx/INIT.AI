# INIT.AI Backend

FastAPI + PostgreSQL backend for the INIT.AI platform, deployed on
**Vercel** (project `backend`, entrypoint `app.main:app`, see `vercel.json`).

## Do I still need to run `uvicorn app.main:app`?

Usually **no**. The production/preview deployment is always live at

```
https://api.initai.site
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
- PostgreSQL (local, or a hosted instance such as Neon) â€” only for local runs

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

The suite uses an in-memory SQLite database with auth stubbed out â€” no
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

Passwords are stored as Argon2id hashes â€” never in plaintext. These
credentials are for local development only.

## Endpoints

All routes are mounted under `/api`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | /api/auth/login | â€“ | Authenticate, sets an HTTP-only session cookie |
| POST   | /api/auth/logout | â€“ | Invalidates the session and clears the cookie |
| GET    | /api/auth/me | â€“ | Current authenticated user (401 if none) |
| GET    | /api/health | â€“ | Service health check |
| GET    | /api/cities | â€“ | List cities |
| GET    | /api/barangays | â€“ | List barangays (with city name) |
| GET    | /api/heat | â€“ | Heat readings, newest first |
| GET    | /api/canopy | â€“ | Canopy readings, newest first |
| GET    | /api/mitigation | â€“ | Mitigation projects |
| GET    | /api/preferences | âœ“ | Get the current user's preferences |
| PUT    | /api/preferences | âœ“ | Update the current user's preferences |
| GET    | /api/reports | â€“ | Reports, newest first (incl. attestation summary) |
| GET    | /api/reports/{id} | â€“ | Single report |
| POST   | /api/reports | âœ“ | Create a report |
| PUT    | /api/reports/{id} | âœ“ | Update a report |
| DELETE | /api/reports/{id} | âœ“ | Delete a report |
| GET    | /api/reports/{id}/attestation-message | â€“ | Server-authoritative content hash + canonical payload |
| GET    | /api/reports/{id}/xdr-prepare | â€“ | Week 2: unsigned XDR preparation params (hash + prevHash + contract + args) |
| GET    | /api/reports/{id}/attestation | â€“ | Persisted Stellar proof history |
| POST   | /api/reports/{id}/attestation | âœ“ | Record a confirmed on-chain attestation |
| GET    | /api/stellar/attestation/{hash} | â€“ | Public lookup: proof by report hash |
| POST   | /api/stellar/geojson-hash | â€“ | Week 2: deterministic GeoJSON hashing pipeline |
| POST   | /api/stellar/simulate | â€“ | Week 2: Soroban RPC simulation proxy with structured codes |

## Project layout

```
app/
â”œâ”€â”€ main.py          # FastAPI app, CORS, router wiring, schema bootstrap
â”œâ”€â”€ core/config.py   # Settings from environment / .env (incl. STELLAR_RPC_URL)
â”œâ”€â”€ db/              # Engine, session, Base, bootstrap helpers, seed script
â”œâ”€â”€ models/          # SQLAlchemy ORM models
â”œâ”€â”€ schemas/         # Pydantic request/response schemas
â”œâ”€â”€ api/             # Route modules (one per resource)
â””â”€â”€ services/        # Report hashing, GeoJSON hashing, Horizon verify, RPC simulate
alembic/             # Migrations
tests/               # pytest suite (SQLite in-memory)
```

## Frontend integration

The React app talks to this API through `src/services/api.ts`. The base URL
comes from `VITE_API_URL` in the root `.env` â€” currently the deployed Vercel
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
  contract id is pinned server-side and Horizon is queried read-only â€”
  no keys or secrets live in this service.
