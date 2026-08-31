# INIT.AI

### AI-Powered Urban Heat Intelligence for Philippine Cities

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

```text
Satellite / Environmental Data
            |
       INIT.AI Backend  (FastAPI + PostgreSQL)
            |
     Canonical JSON payload          <- deterministic, versioned spec
            |
       SHA-256 Hash                   <- server-authoritative
            |
     Soroban Contract                <- wallet-signed via Freighter
            |
     Stellar Testnet
            |
   Verifiable Attestation
```

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

Report titles, municipality/barangay names, coordinates, GeoJSON, imagery,
reporting periods, and LGU identifiers are **never** placed on-chain.

### Duplicate definition

A **duplicate** means *the same SHA-256 digest globally across the contract* -
regardless of wallet, LGU, or reporting period. The contract rejects a second
attestation of an existing digest, so each proof is unambiguous. A legitimate
re-attestation only occurs when report **content changes**, producing a *new*
digest and therefore a new, independent attestation.

### Revision handling

Revisions are simple and immutable: editing a report produces a new canonical
digest and a **new attestation transaction**. Original on-chain records are
never modified, replaced, or deleted. Off-chain, the database groups a
report's proof history by report id, so the full revision timeline stays
queryable while each on-chain record stands alone.

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

## Backend

![Python](https://img.shields.io/badge/python-%233670A0.svg?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/fastapi-%23009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Rust](https://img.shields.io/badge/rust-%23000000.svg?style=for-the-badge&logo=rust&logoColor=white)
![Stellar](https://img.shields.io/badge/Stellar-%237D00FF.svg?style=for-the-badge&logo=Stellar&logoColor=white)

# 6. Product Showcase

## Evidence Index

One table for reviewers - everything needed to verify this project:

| Item | Value / Link |
| --- | --- |
| Network | Stellar **Testnet** only |
| Contract ID | [`CBQSI2TXAXWNRBPFT457JVH5IUVWKR72XMNQFTSPHDUWRRV76SBDUBXF`](https://stellar.expert/explorer/testnet/contract/CBQSI2TXAXWNRBPFT457JVH5IUVWKR72XMNQFTSPHDUWRRV76SBDUBXF) |
| Contract source | [`contracts/soroban/`](contracts/soroban/) (Rust + soroban-sdk 27, unit-tested) |
| Live dApp | [https://init-ai-ebon.vercel.app](https://init-ai-ebon.vercel.app) |
| API documentation | [https://backend-phi-gray-27.vercel.app/docs](https://backend-phi-gray-27.vercel.app/docs) (FastAPI/OpenAPI) |
| Canonicalization spec | [`initai-canonical-v1`](#canonicalization-specification-initai-canonical-v1) - rules + implementation in [`backend/app/services/report_hash.py`](backend/app/services/report_hash.py) |
| Test vectors | [`backend/tests/test_report_hash.py`](backend/tests/test_report_hash.py) (6 vectors: determinism, float normalization, unicode, known-digest) |
| Transaction receipts | See [Transaction Receipts](#transaction-receipts) below |
| Wallets used | See [Wallets](#wallets) below |
| Demo video | W.I.P |

## Transaction Receipts

Each Testnet receipt is labeled with its attestation type and a non-sensitive
digest prefix (full digests live in the database and on-chain, not here).

| # | Report ref | Type | Date (UTC) | Source wallet | Digest prefix | Transaction |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `7` | original | 2026-08-24 11:39:59 | `GBBU32EB...FAHY` (ops) | `923ab672...` | [`431266e6...40b89`](https://stellar.expert/explorer/testnet/tx/431266e6e39da647c15873385568952cd1dd8881346452bdec407cf1fbe40b89) |
| 2 | `smoke-test` | deployment smoke test | 2026-08-24 08:49:09 | `GBBU32EB...FAHY` (ops) | `aaaa...` (synthetic pattern) | [`bf9a2855...9375`](https://stellar.expert/explorer/testnet/tx/bf9a285558eea50b89982bcdccad6ae44ea33cf90739a925cba402b4b8429375) |

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
stellar contract invoke --id CBQSI2TX... --network testnet --source initai-deployer \
  -- attest --submitter <wallet> --hash <already-attested-hash> --report_id "7"
# -> error: "attestation already exists for this report hash"
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

## Product Demo

> **Product Link**
> [INIT.AI Vercel Deployment](https://init-ai-ebon.vercel.app)

> **Demo Video:**
> W.I.P

**Video description:**
A short demonstration showing the INIT.AI platform, including login, dashboard navigation, heat visualization, hotspot analysis, canopy analysis, reporting, and the Stellar verification workflow - including at least one expected failure case (duplicate-attestation or signature rejection) alongside a successful attestation.

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

## Additional Media

**Demo / Presentation Video:**
W.I.P

**Product Walkthrough:**
W.I.P

**Additional Screenshots / Product Gallery:**
W.I.P

**Pitch Deck:**
W.I.P

---

# 7. Project Architecture

```text
                    +----------------------+
                    |   Satellite Data     |
                    | Environmental Data   |
                    +----------------------+
                               |
                               v
                    +----------------------+
                    |       INIT.AI        |
                    | React + TypeScript   |
                    |       + Vite         |
                    +----------------------+
                               |
                               v
                    +----------------------+
                    |       FastAPI        |
                    |  Data Processing &   |
                    |    AI Services       |
                    +----------------------+
                         |            |
         +---------------+            +----------------------+
         v                                                   v
+----------------------+                     +----------------------+
| PostgreSQL +         |                     |  SHA-256 Hashing     |
| PostGIS / Neon       |                     | (canonical report    |
+----------------------+                     |  JSON, server-side)  |
                                             +----------------------+
                                                      |
                                                      v
                                             +----------------------+
                                             |  Soroban Smart       |
                                             |      Contract        |
                                             +----------------------+
                                                      |
                                                      v
                                             +----------------------+
                                             |   Stellar Testnet    |
                                             +----------------------+
```

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

---

# 8. Team

INIT.AI is developed by a three-person team.

| Member   | Role                 | Responsibilities                                                                                  |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| **Rain** | Project Manager      | Project direction, coordination, planning, and overall product management                         |
| **Sean** | Full-stack Developer | Frontend, backend, database, system architecture, Stellar/Soroban integration, and implementation |
| **Marc** | Quality Assurance    | Testing, validation, bug identification, usability checks, and quality assurance                  |

### Team Members

**Angelo Rain Regencia**
Project Manager

> [LinkedIn](www.linkedin.com/in/angelo-rain-regencia-142ab0241/)

**Sean Astin Navarro**
Full-stack Developer

> [Github](https://github.com/cseanx) [LinkedIn](www.linkedin.com/in/cseanxdev)

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