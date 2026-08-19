# INIT.AI

### AI-Powered Urban Heat Intelligence for Philippine Cities

INIT.AI is a climate intelligence platform designed to help cities understand, monitor, and respond to **urban heat** using satellite-derived environmental data, geospatial analysis, and AI-assisted insights.

The platform transforms complex environmental data into actionable information for local governments, climate analysts, and field teams.

---

## Getting started

```bash
npm install
npm run dev        # start the Vite dev server
npm run build      # typecheck + production build (outputs to dist/)
npm run preview    # serve the production build
```

## Notes

- All chart instances are destroyed on unmount (`components/common/ChartCanvas.tsx`).
- Pages are lazy-loaded; Chart.js is split into its own chunk.
- The prototype uses mock environmental data — nothing here is real
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

Important environmental records can be cryptographically hashed and associated with a Stellar/Soroban attestation, providing a verifiable record of the data submitted to the system.

---

# 4. How INIT.AI Uses Stellar

Stellar is used as a **verification and attestation layer**, rather than as the primary database for INIT.AI.

Environmental data remains in the application's backend and database, while selected records can be represented by a cryptographic hash and associated with an on-chain attestation.

### Data Flow

```text
Satellite / Environmental Data
            ↓
       INIT.AI Backend
            ↓
     Data Processing
            ↓
       SHA-256 Hash
            ↓
     Soroban Contract
            ↓
     Stellar Testnet
            ↓
   Verifiable Attestation
```

This allows INIT.AI to maintain its existing data-processing architecture while using Stellar to provide an additional layer of **data integrity and verifiability**.

### Why Stellar?

Environmental datasets may be updated, processed, or aggregated over time. A cryptographic attestation provides a way to demonstrate that a particular dataset or environmental report existed in a specific state when it was recorded.

Instead of storing the entire dataset on-chain, INIT.AI stores a **cryptographic representation of the relevant data**, keeping the system practical while still providing verifiability.

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

  * Transaction signing
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

## Product Demo

> **Product Link**
> [INIT.AI Vercel Deployment](init-ai-ebon.vercel.app)

> **Demo Video:**
> W.I.P

**Video description:**
A short demonstration showing the INIT.AI platform, including login, dashboard navigation, heat visualization, hotspot analysis, canopy analysis, reporting, and the Stellar verification workflow.

---

## Product Screenshots

### Dashboard

![INIT.AI Dashboard](INSERT_IMAGE_URL_HERE)

> **Screenshot:** Main INIT.AI dashboard showing city-level environmental metrics and heat indicators.

### Heat Map

![INIT.AI Heat Map](INSERT_IMAGE_URL_HERE)

> **Screenshot:** Spatial visualization of urban heat across the selected city.

### Hotspots

![INIT.AI Hotspots](INSERT_IMAGE_URL_HERE)

> **Screenshot:** Ranked heat hotspots and their associated environmental indicators.

### Canopy Analysis

![INIT.AI Canopy Analysis](INSERT_IMAGE_URL_HERE)

> **Screenshot:** Vegetation and canopy coverage analysis.

### Stellar Verification

![INIT.AI Stellar Verification](INSERT_IMAGE_URL_HERE)

> **Screenshot:** INIT.AI workflow demonstrating environmental data verification through Stellar/Soroban.

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
                    ┌─────────────────────┐
                    │   Satellite Data    │
                    │ Environmental Data  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      INIT.AI        │
                    │ React + TypeScript  │
                    │       + Vite        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      FastAPI        │
                    │  Data Processing    │
                    │   & AI Services     │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
       ┌─────────────────┐        ┌─────────────────┐
       │ PostgreSQL +    │        │ SHA-256 Hashing │
       │ PostGIS / Neon  │        └────────┬────────┘
       └─────────────────┘                 │
                                           ▼
                                ┌─────────────────────┐
                                │  Soroban Smart      │
                                │      Contract       │
                                └──────────┬──────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │   Stellar Testnet   │
                                └─────────────────────┘
```

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