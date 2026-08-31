# INIT.AI

### AI-Powered Urban Heat Intelligence for Philippine Cities

**Monitor urban heat. Verify what matters on Stellar.**

[![Status](https://img.shields.io/badge/Status-Testnet_Alpha-18181b?style=flat-square)](https://stellar.expert/explorer/testnet/contract/CBQSI2TXAXWNRBPFT457JVH5IUVWKR72XMNQFTSPHDUWRRV76SBDUBXF) [![Stellar](https://img.shields.io/badge/Stellar-Soroban-7D00FF?style=flat-square&logo=stellar&logoColor=white)](https://developers.stellar.org/docs/learn/fundamentals/contract-development) [![React](https://img.shields.io/badge/React-19-20232a?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev) [![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev) [![FastAPI](https://img.shields.io/badge/FastAPI-0.1-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com) [![Rust](https://img.shields.io/badge/Rust-Soroban-dea584?style=flat-square&logo=rust&logoColor=black)](https://soroban.stellar.org) [![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

[Live dApp](https://init-ai-ebon.vercel.app) · [API Docs](https://backend-phi-gray-27.vercel.app/docs) · [Contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBQSI2TXAXWNRBPFT457JVH5IUVWKR72XMNQFTSPHDUWRRV76SBDUBXF) · [Run Locally](#getting-started) · [Canonical Spec](#canonicalization-specification-initai-canonical-v1)

> **Important:** INIT.AI is a prototype on **Stellar Testnet** only. Attestations are wallet-submitted, not LGU-certified. Mainnet, production audit, and official endorsement are not claimed.

INIT.AI is a climate intelligence platform designed to help cities understand, monitor, and respond to **urban heat** using satellite-derived environmental data, geospatial analysis, and AI-assisted insights.

The platform transforms complex environmental data into actionable information for local governments, climate analysts, and field teams.

---

## Getting started

```bash
npm install
cp .env.example .env              # frontend env (VITE_API_URL, Stellar Testnet config)
# for local backend only: cp backend/.env.example backend/.env  # then set DATABASE_URL
npm run dev        # start the Vite dev server
npm run build      # typecheck + production build (outputs to dist/)
npm run preview    # serve the production build
```

> Backend is deployed at `https://backend-phi-gray-27.vercel.app` — `npm run dev` works without a local backend. For local API/database work see [`backend/README.md`](backend/README.md).

## Notes

- All chart instances are destroyed on unmount (`components/common/ChartCanvas.tsx`).
- Pages are lazy-loaded; Chart.js is split into its own chunk.
- The prototype uses mock environmental data - nothing here is real
  satellite/sensor data yet.


## 1. The Problem

Cities across the Philippines are experiencing increasing urban heat caused by factors such as:

* Dense built-up areas
* Loss of vegetation and tree canopy
* Impervious surfaces such as concrete and asphalt
* Rapid urban development
* Limited access to localized environmental data
* Difficulty translating satellite and geospatial data into actionable decisions

Although satellite and environmental datasets are increasingly available, the information can be difficult for local governments to interpret and use for planning.

INIT.AI addresses this gap by providing a centralized platform for **visualizing, analyzing, and acting on urban heat data at the city and barangay level.**

---

## 2. Our Solution

INIT.AI combines **satellite data, geospatial analysis, AI-assisted analysis, and a verification layer powered by Stellar** into a single platform.

The system is designed to allow users to:

1. Select and monitor a city
2. Visualize urban heat patterns
3. Identify high-risk heat hotspots
4. Analyze vegetation and canopy coverage
5. Examine barangay-level environmental conditions
6. Generate reports and insights
7. Record and verify important environmental findings

The goal is to turn raw environmental data into information that can support **evidence-based urban planning and climate mitigation.**

---

# 3. Key Features

### Heat Map

Visualizes spatial heat patterns across a selected city, allowing users to quickly identify areas experiencing elevated surface temperatures.

### Hotspot Detection

Ranks areas based on heat severity and identifies locations that may require greater attention or mitigation.

### Heat Canopy Analysis

Analyzes the relationship between vegetation coverage and urban heat, helping identify areas where low canopy coverage may contribute to elevated temperatures.

### Barangay Analysis

Allows users to examine heat conditions at the barangay level rather than relying only on city-wide averages.

### Reports & Analytics

Provides summarized environmental metrics and visualizations that can be used for monitoring and decision-making.

### Satellite Data Integration

Uses satellite-derived environmental data as a foundation for heat and land-cover analysis.

### AI-Assisted Analysis

Provides intelligent interpretation of environmental patterns and can assist users in identifying potential heat drivers and mitigation opportunities.

### Data Verification

Important environmental records can be cryptographically hashed and recorded
on-chain as a **wallet-submitted attestation** on the Stellar Testnet - an
independently verifiable, write-once proof that a specific report existed in
a specific form at a specific time.

> **Terminology note:** attestations prove *wallet-submitted* records. They
> do **not** constitute official LGU certification or government endorsement.

---

# 4. How INIT.AI Uses Stellar

Stellar is used as a **verification and attestation layer**, rather than as the primary database for INIT.AI.

Environmental data remains in the application's backend and database, while selected records can be represented by a cryptographic hash and associated with an on-chain attestation.

### Data Flow

![DataFlow](/public/assets/images/DataFlow.png)

This allows INIT.AI to maintain its existing data-processing architecture while using Stellar to provide an additional layer of **data integrity and verifiability**.

### Why Stellar?

Environmental datasets may be updated, processed, or aggregated over time. A cryptographic attestation provides a way to demonstrate that a particular dataset or environmental report existed in a specific state when it was recorded.

Instead of storing the entire dataset on-chain, INIT.AI stores a **cryptographic representation of the relevant data**, keeping the system practical while still providing verifiability.

### What the chain proves - and what it does not

The trust boundary is explicit:

| The attestation **proves** | The attestation **does not prove** |
| --- | --- |
| The transaction was executed on Stellar Testnet at a specific ledger/time | Scientific accuracy of the data |
| The digest was recorded by a specific wallet | Completeness of the dataset |
| The report content is unchanged since attestation (digest still matches) | That the submitting wallet was authorized by an LGU |
| Tamper-evidence: any later edit produces a different digest | Real-world identity of the signer |

Accordingly, INIT.AI uses the term **"wallet-submitted attestation"** - never "official LGU-certified report."

### On-chain metadata is minimal

The Soroban contract stores only:

| Field | Form |
| --- | --- |
| Report digest | SHA-256, 32 bytes |
| Report reference | Opaque numeric id (e.g. `"7"`) |
| Submitter | Stellar account address |
| Attestation time | Ledger sequence + unix timestamp |
| Previous hash | `Option<BytesN<32>>` — `None` for first version, `Some(prev)` for revisions (on-chain revision chain) |

Report titles, municipality/barangay names, coordinates, GeoJSON, imagery,
reporting periods, and LGU identifiers are **never** placed on-chain.

### Duplicate definition

A **duplicate** means *the same SHA-256 digest globally across the contract* -
regardless of wallet, LGU, or reporting period. The contract rejects a second
attestation of an existing digest, so each proof is unambiguous. A legitimate
re-attestation only occurs when report **content changes**, producing a *new*
digest and therefore a new, independent attestation.

### Revision handling (on-chain)

Revisions are **on-chain linked and immutable**: editing a report produces a
new canonical digest and a **new attestation transaction** that includes
`prev_hash` — the SHA-256 of the previous version.

* First version: `attest(submitter, hash, report_id, None)` — no previous hash.
* Next versions: `attest(submitter, new_hash, report_id, Some(prev_hash))` —
  the contract validates that `prev_hash` exists and belongs to the same
  `report_id`, enforcing a linear, tamper-evident chain. Any mismatch
  (`prev` unknown or different `report_id`) panics.

Original on-chain records are never modified, replaced, or deleted. Off-chain,
the database mirrors the chain in `report_attestations.prev_hash` and groups
history by `report_id`, so the full revision timeline is queryable both
on-chain (`verify(hash).prev_hash`) and off-chain while each proof stands
alone. Walking the chain: `verify(latest_hash)` → `prev_hash` → `verify(prev_hash)` → ...

### Stellar Technologies Used

* **Soroban**

  * Smart contract layer for environmental data attestations
* **Rust**

  * Smart contract development language
* **soroban-sdk**

  * Soroban smart contract framework
* **stellar-cli**

  * Contract compilation, optimization, testing, and deployment
* **@stellar/stellar-sdk**

  * Stellar transaction and XDR handling
* **StellarWalletsKit**

  * Wallet connection
* **Freighter**

  * Transaction signing (user-controlled keys - the backend never holds
    private keys)
* **Stellar Testnet**

  * Development and demonstration network

---

# 5. Technology Stack

## Frontend

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-%23CA4245.svg?style=for-the-badge&logo=react-router&logoColor=white)
![Chart.js](https://img.shields.io/badge/chart.js-%23F5788D.svg?style=for-the-badge&logo=chart.js&logoColor=white)
![MapLibre](https://img.shields.io/badge/MapLibre-%233969FF.svg?style=for-the-badge&logo=maplibre&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-%2388CE02.svg?style=for-the-badge&logo=greensock&logoColor=white)

## Backend

![Python](https://img.shields.io/badge/python-%233670A0.svg?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/fastapi-%23009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-%23336791.svg?style=for-the-badge&logo=sqlalchemy&logoColor=white)
![Alembic](https://img.shields.io/badge/Alembic-%23000000.svg?style=for-the-badge&logo=python&logoColor=white)
![Pydantic](https://img.shields.io/badge/Pydantic-%23E92063.svg?style=for-the-badge&logo=pydantic&logoColor=white)
![Uvicorn](https://img.shields.io/badge/Uvicorn-%23009688.svg?style=for-the-badge&logo=gunicorn&logoColor=white)
![Argon2](https://img.shields.io/badge/Argon2-%23EA2D2E.svg?style=for-the-badge&logo=python&logoColor=white)
![pytest](https://img.shields.io/badge/pytest-%230A9EDC.svg?style=for-the-badge&logo=pytest&logoColor=white)

## Stellar, Soroban & Wallet

![Rust](https://img.shields.io/badge/rust-%23000000.svg?style=for-the-badge&logo=rust&logoColor=white)
![Stellar](https://img.shields.io/badge/Stellar-%237D00FF.svg?style=for-the-badge&logo=Stellar&logoColor=white)
![Soroban](https://img.shields.io/badge/Soroban-%237D00FF.svg?style=for-the-badge&logo=stellar&logoColor=white)
![Horizon](https://img.shields.io/badge/Horizon-%2300BFFF.svg?style=for-the-badge&logo=stellar&logoColor=white)
![Freighter](https://img.shields.io/badge/Freighter-%2300A9E0.svg?style=for-the-badge&logo=stellar&logoColor=white)
![Wallets Kit](https://img.shields.io/badge/Wallets_Kit-%2300719F.svg?style=for-the-badge&logo=stellar&logoColor=white)
![stellar--cli](https://img.shields.io/badge/stellar--cli-%23000000.svg?style=for-the-badge&logo=stellar&logoColor=white)

## Deployment & Tooling

![npm](https://img.shields.io/badge/npm-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
![Neon](https://img.shields.io/badge/Neon-%2300E699.svg?style=for-the-badge&logo=neon&logoColor=white)

# 6. Product Showcase

## Evidence Index

One table for reviewers - everything needed to verify this project:

| Item | Value / Link |
| --- | --- |
| Network | Stellar **Testnet** only |
| Contract ID | [`CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4`](https://stellar.expert/explorer/testnet/contract/CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4) |
| Contract source | [`contracts/soroban/`](contracts/soroban/) (Rust + soroban-sdk 27, unit-tested, `prev_hash` on-chain) |
| WASM artifact | `target/wasm32v1-none/release/initai_spatial_attestation.wasm` — **28,844 bytes**, **SHA-256** `19f8b4bddb717f60aa70116e0c6c0e86e45e3488f0d307dafa277c8534ba210e` — built `2026-08-31` with **on-chain `prev_hash`** via `stellar contract build` / `cargo build --target wasm32v1-none --release` (Rust `1.98.0`, `soroban-sdk 27.0.1`, `opt-level="z"` + `lto=true`) — `target/` is gitignored; verify with `Get-FileHash -Algorithm SHA256` or `sha256sum` — wasm hash `19f8b4...` matches deploy (Soroban deploys are immutable) |
| Live dApp | [https://init-ai-ebon.vercel.app](https://init-ai-ebon.vercel.app) |
| API documentation | [https://backend-phi-gray-27.vercel.app/docs](https://backend-phi-gray-27.vercel.app/docs) (FastAPI/OpenAPI) |
| Canonicalization spec | [`initai-canonical-v1`](#canonicalization-specification-initai-canonical-v1) - rules + implementation in [`backend/app/services/report_hash.py`](backend/app/services/report_hash.py) |
| Test vectors | [`backend/tests/test_report_hash.py`](backend/tests/test_report_hash.py) (6 vectors: determinism, float normalization, unicode, known-digest) |
| Transaction receipts | See [Transaction Receipts](#transaction-receipts) below |
| Wallets used | See [Wallets](#wallets) below |
| Demo video | W.I.P |

## Current Testnet Contract

| Contract | Address | Explorer | Source |
| --- | --- | --- | --- |
| `SpatialAttestationRegistry` | `CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4) | [`contracts/soroban/`](contracts/soroban/) |

> Deployed `2026-08-31` with stellar-cli `28.0.0` (wasm `19f8b4...`, 28,844 bytes) — wasm hash on-chain matches build. Previous deployment `CBQSI2TXAXWNRBPFT457JVH5IUVWKR72XMNQFTSPHDUWRRV76SBDUBXF` (2026-08-24) is superseded. After any redeploy, update this table, `.env.example`, `backend/.env.example`, and `backend/app/core/config.py` together.

## Transaction Receipts

Each Testnet receipt is labeled with its attestation type and a non-sensitive
digest prefix (full digests live in the database and on-chain, not here).
Contract `CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4` (wasm `19f8b4...`). Previous contract `CBQSI2...UBXF` had 2 attestations (archived).

| # | Report ref | Type | Date (UTC) | Source wallet | Digest prefix | `prev_hash` | Transaction |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `smoke-test` | first version (None) | 2026-08-31  | `GBBU32EB...FAHY` (ops) | `aaaa...` (synthetic `0xaa×32`) | `None` | [`66a6900a...318f6`](https://stellar.expert/explorer/testnet/tx/66a6900a24fa4851a5730352af35e1bf5ca8e963ee2fb6d712e7202fd75318f6) |
| 2 | `smoke-test` | revision (Some prev) | 2026-08-31  | `GBBU32EB...FAHY` (ops) | `bbbb...` (synthetic `0xbb×32`) | `aaaa...` | [`48f4128e...6985`](https://stellar.expert/explorer/testnet/tx/48f4128e7973a15104de3560aade97d6994a0ff0e15b3459dd1915cb1d1c6985) |

> **On-chain revision demo**: v1 `aaaa...` has `prev_hash: null`; v2 `bbbb...` has `prev_hash: aaaa...` same `report_id` `smoke-test` — walkable via `verify(bbbb...).prev_hash` → `aaaa...`. Duplicate and mismatched `prev_hash` correctly panic (see Failure-Handling below). Explorer links above show ledger `4431681` / `4431689`.

### Wallets

Two distinct wallets are used in this prototype:

| Wallet | Role | Address |
| --- | --- | --- |
| **Ops / deployer** | Contract deployment + CLI demonstrations | `GBBU32EB3VNOIGDS6GUJ6JWWONQ6NP73BRG6IVE5D4BV3LCTYEJJFAHY` |
| **Demo user** | End-user Freighter wallet for in-app attestations | `GDJ24SBS6QRLRHU2ILDTBM3YHXMW6E6QSTHX6OHPFWAHQHPJOTWGQL22` |

Private keys for neither wallet exist in this repository.

## Failure-Handling Demonstrations

The implementation visibly handles expected failures, not just the happy path:

**1. Duplicate-attestation rejection (on-chain):**

```bash
stellar contract invoke --id CDYHVMVLSKZ... --network testnet --source initai-deployer \
  -- attest --submitter <wallet> --hash <already-attested-hash> --report_id "7"
# -> error: "attestation already exists for this report hash"
```

**1b. Revision `prev_hash` rejection (on-chain):**

```bash
# Unknown prev -> panic "prev_hash references unknown attestation"
stellar contract invoke --id CDYHVMVLSKZ... --network testnet --source initai-deployer \
  -- attest --submitter <wallet> --hash <new-hash> --report_id "7" --prev_hash '"ffffffff...ffff"'

# Mismatched report_id -> panic "prev_hash must reference same report_id"
stellar contract invoke --id CDYHVMVLSKZ... --network testnet --source initai-deployer \
  -- attest --submitter <wallet> --hash <new-hash2> --report_id "8" --prev_hash '"aaaaaaaa...aaaa"'
# aaaa... belongs to report 7, not 8
```

**2. Fabricated transaction rejection (server-side, HTTP 422):** submitting an
invented transaction hash to `POST /api/reports/{id}/attestation` is rejected -
the backend checks Horizon and confirms the transaction exists, succeeded, and
invokes `attest` with the claimed wallet/hash/report-ref before storing anything.

**3. User signature rejection (client-side):** declining the Freighter popup
shows a friendly failure state - *"The signature request was declined in your
wallet."* - with the report left unattested and fully editable.

**4. Post-signing edit detection:** editing a report after attestation changes
its canonical digest; the verification line then reports the proof no longer
matches the current content (tamper-evidence working as intended).

## Product

> **Product Link**
> [INIT.AI Vercel Deployment](https://init-ai-ebon.vercel.app)

---

## Product Screenshots

### Dashboard

![INIT.AI Dashboard](/public/assets/images/Dashboard.png)

### Heat Map

![INIT.AI Heat Map](/public/assets/images/Heatmap.png)

### Hotspots

![INIT.AI Hotspots](/public/assets/images/Hotspots.png)

### Canopy Analysis

![INIT.AI Canopy Analysis](/public/assets/images/CanopyAnalysis.png)

### Stellar Verification

![INIT.AI Stellar Verification](/public/assets/images/StellarReport.png)

---

# 7. Project Architecture

![ProjectArchitecture](/public/assets/images/ProjectArchitecture.png)

---

# Canonicalization Specification (`initai-canonical-v1`)

This specification is a **first-class deliverable**: the same report must
always produce the same SHA-256 digest, on any machine, in any language.

**Version:** `initai-canonical-v1` (any future breaking change bumps the version)

### Input

The report **as stored in the PostgreSQL database** - never client-supplied
content. The backend (`backend/app/services/report_hash.py`) is the single
authoritative implementation.

### Field set (exactly the frontend `ReportPayload`)

`title, type, status, area, city, coverage, periodStart, periodEnd,
preparedBy, autoPriorityAreas, datasets, areas, sections, recommendations,
avgSurfaceTemp, peakTemp, peakArea, criticalCount, highCount, moderateCount,
avgCanopy, mitigationProjects, generatedAt`

Excluded on purpose: database ids, `created_at`, and any DB-side metadata -
the proof covers **report content only**.

### Serialization rules (plain language)

1. Object keys are sorted alphabetically, recursively (arrays keep order).
2. JSON is written compactly - no spaces between keys and values.
3. Text is raw UTF-8; non-ASCII characters are **not** escaped (`Munoz`, not `Mu\u00f1oz`).
4. Whole-number floats are written as integers (`36`, never `36.0`).
5. Timestamps are ISO-8601 in UTC.
6. The digest is `SHA-256` over the exact UTF-8 bytes of that JSON string,
   rendered as 64 lowercase hex characters.

### Test vectors

`backend/tests/test_report_hash.py` contains six vectors covering:
determinism (same input -> same digest), content-change -> different digest,
database-id independence, integral-float normalization (`36.0` == `36`),
a known-digest vector, and unicode stability.

Run them: `python -m pytest tests/test_report_hash.py -q` (from `backend/`).

## Test and Validate

```bash
# frontend
npm run build        # tsc + vite build
# backend (from backend/)
python -m pytest tests -q
# contract (requires Rust + stellar-cli)
cargo test --manifest-path contracts/soroban/Cargo.toml
stellar contract build --manifest-path contracts/soroban/Cargo.toml
```

## Performance and Benchmarking

Measured **2026-08-31** on local dev machine (Windows 11, Node `24.15.0` / npm `11.12.1`, Python `3.14.3`, Rust `1.98.0`, cargo `1.98.0`) and against the deployed Vercel backend. No mocked timings — all numbers are from real runs on this commit.

**A. Local build & unit tests (deterministic, offline)**

| Target | Command | Result (this machine) |
| --- | --- | --- |
| Frontend build | `npx vite build` (3 runs) | `5.86s` / `6.00s` / `6.55s` — avg `~6.14s` |
| Backend tests | `python -m pytest tests -q` (23 tests, SQLite in-memory) | cold `9.95s` (first import), warm `3.62s` / `4.09s` — avg warm `~3.9s`, `23 passed` |
| Contract tests | `cargo test --manifest-path contracts/soroban/Cargo.toml` | compile `~16.1s` + exec `0.02s`, `6 passed` (total `~17.4s` first build, `~0.5s` incremental) |
| Canonical hash | `attestation_hash` on representative report (597-byte JSON) | `~94k` hashes/s, `10.6 µs`/hash; `canonical_json` alone `~120k` ops/s, `8.3 µs`/op |

Hash example: `9bdd0a8739d3d543561045e07559695856dfe5f0dcab371c212d6ffabfc167ea` (597-byte canonical JSON). See `backend/app/services/report_hash.py:41-82` for the `initai-canonical-v1` implementation.

**B. Deployed API — `GET /api/health` (Vercel, sequential, 50 requests)**

Workload: 50 sequential `GET https://backend-phi-gray-27.vercel.app/api/health` via `urllib` (concurrency `1`, 10s timeout), from AP-Southeast-1 residential network to Vercel. Vercel is serverless — expect cold-start outliers; this is not provisioned-infra benchmarking.

| Observed metric | Result |
| --- | --- |
| Attempted requests | 50 |
| Successful | 50 (100%) |
| Errors / dropped | 0 / 0 |
| p50 latency | `133.2 ms` |
| p95 latency | `207.6 ms` |
| p99 latency | `2325.1 ms` (single cold start) |
| min / mean / max | `121.6 ms` / `180.9 ms` / `2325.1 ms` |

> Concurrent burst (100 requests, concurrency `10`) was also measured: `p50 136.7 ms`, `p95 2034.5 ms`, `mean 302.6 ms`, `32 req/s` over `3.12s` — p95 inflates under burst due to multiple cold starts. Sequential numbers above reflect steady-state latency.

No `benchmarks/reports/*.json` is committed — the table above is the verifiable record for this commit. Re-run with `python -m pytest tests -q`, `npx vite build`, or the `urllib` snippet above to reproduce.

## Repository Map

```
.
├── src/                 # React + Vite frontend (pages, components, services/stellar)
├── backend/             # FastAPI + PostgreSQL (app/, alembic/, tests/)
│   ├── app/services/report_hash.py  # canonicalization (initai-canonical-v1)
│   └── app/api/reports.py           # attestation-message + attestation endpoints
├── contracts/soroban/   # Rust Soroban contract (SpatialAttestationRegistry)
└── README.md            # this file (Evidence Index is source of truth)
```

---

# 8. Team

INIT.AI is developed by a three-person team.

| Member   | Role                 | Responsibilities                                                                                  |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| **Rain** | Project Manager      | Project direction, coordination, planning, and overall product management                         |
| **Sean** | Full-stack Developer | Frontend, backend, database, system architecture, Stellar/Soroban integration, and implementation |
| **Marc** | Quality Assurance    | Testing, validation, bug identification, usability checks, and quality assurance                  |

### Links

**Angelo Rain Regencia**
Project Manager

> [GitHub](https://github.com/angelorainregencia-code) [LinkedIn](www.linkedin.com/in/angelo-rain-regencia-142ab0241/)

**Sean Astin Navarro**
Full-stack Developer

> [GitHub](https://github.com/cseanx) [LinkedIn](www.linkedin.com/in/cseanxdev)

**Marc Joshua Valenzuela**
Quality Assurance

> [LinkedIn](www.linkedin.com/in/marc-joshua-valenzuela-449923427/)

---

# 9. Project Status

INIT.AI is currently under active development as a prototype.

Current development focuses on:

* Core urban heat visualization
* City and barangay analysis
* Environmental analytics
* Data processing
* AI-assisted analysis
* Stellar/Soroban integration
* Data verification workflows

Some features shown in the interface may represent prototype or mock data while the corresponding data pipelines are being developed.

---

# 10. Vision

INIT.AI aims to make environmental intelligence more accessible to the cities and communities that need it.

By combining **earth observation, AI, geospatial analysis, and verifiable data infrastructure**, INIT.AI seeks to provide local governments with a practical way to understand urban heat and make better-informed climate decisions.

> **From satellite data to actionable climate intelligence.**