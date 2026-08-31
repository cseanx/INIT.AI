# SpatialAttestationRegistry — INIT.AI × Stellar/Soroban

A minimal Soroban smart contract that gives INIT.AI reports **tamper-evident,
on-chain proof of existence**: anyone can later prove that a specific report,
in its exact form, existed at a specific point in time.

- **Network:** Stellar Testnet only
- **SDK:** `soroban-sdk` 27.x · Rust stable ≥ 1.85 · WASM target `wasm32v1-none`
- **Contract artifact:** `target/wasm32v1-none/release/initai_spatial_attestation.wasm`

---

## Why this exists

INIT.AI reports live in PostgreSQL and can be edited or deleted by design.
Stellar provides an independent, append-only witness: at generation time the
app hashes the *canonical report payload* and records that hash on-chain.
Later, recomputing the hash and comparing it against the chain proves whether
the report was modified after attestation.

### What goes on-chain (and what never does)

| On-chain (Soroban storage)          | Never on-chain                          |
| ----------------------------------- | --------------------------------------- |
| SHA-256 hash (`BytesN<32>`)         | Report body / recommendations           |
| Report reference id (`String`)      | Satellite imagery                       |
| Submitter address (`Address`)       | GeoJSON layers / LST grids              |
| Ledger sequence + unix timestamp    | Personal data                           |
| Previous hash (`Option<BytesN<32>>`) — revision link | Full history (reconstructed via chain)  |

Nothing larger than ~a few hundred bytes is ever submitted.

---

## Data flow

```
INIT.AI Report (PostgreSQL)
        │
        ▼
Canonical JSON payload            src/reports/reportService.ts (buildReportPayload)
        │
        ▼
SHA-256  →  BytesN<32>            WebCrypto (frontend)
        │
        ▼
"Verify on Stellar" button        ReportEditor.tsx
        │
        ▼
Freighter wallet signature        @creit-tech/stellar-wallets-kit
        │
        ▼
attest(submitter, hash, ref)      this contract (Soroban invoke)
        │
        ▼
Stellar Testnet                   https://soroban-testnet.stellar.org
        │
        ▼
"Verified on Stellar"             tx hash + contract id shown in the UI;
                                  verify(hash) readable by anyone forever
```

---

## Contract interface

```rust
pub struct Attestation {
    pub hash:            BytesN<32>,              // SHA-256 of the canonical report payload
    pub report_id:       String,                  // INIT.AI numeric report id, as a short string
    pub submitter:       Address,                 // wallet account that signed
    pub ledger_sequence: u32,                     // ledger height at attestation
    pub recorded_at:     u64,                     // ledger unix timestamp
    pub prev_hash:       Option<BytesN<32>>,      // None = first version, Some(prev) = revision link
}

impl SpatialAttestationRegistry {
    /// Record an attestation. Requires `submitter`'s authorization
    /// (wallet signature). Panics if the exact hash was already attested —
    /// one proof per form keeps the registry unambiguous.
    /// When `prev_hash` is Some, validates that it exists and belongs to the
    /// same report_id, enforcing an on-chain linear revision chain.
    pub fn attest(env, submitter: Address, hash: BytesN<32>, report_id: String, prev_hash: Option<BytesN<32>>) -> Attestation;

    /// Returns Some(Attestation) if this exact payload was attested, else None.
    pub fn verify(env, hash: BytesN<32>) -> Option<Attestation>;

    /// Number of attestations recorded.
    pub fn total_attestations(env) -> u32;
}
```

Design notes:

- **No admin / owner key.** The contract is trust-neutral: whoever signs owns
  their attestation; there is no upgrade path or privileged withdrawal.
- **Duplicate rejection** prevents silently overwriting a proof.
- **On-chain revision chain** via `prev_hash: Option<BytesN<32>>` — first version is `None`, every edit links `Some(prev)`. Validated: `prev` must exist and have same `report_id`; otherwise panic.
- **Persistent storage with TTL extension** (~1 year bumped on every write /
  verified read) so long-lived proofs stay retrievable without manual top-ups.

---

## Build

Requires Rust stable ≥ 1.85 and the `wasm32v1-none` target:

```bash
rustup target add wasm32v1-none

# Option A — Stellar CLI (preferred; sets the right flags automatically):
stellar contract build
#   → target/wasm32v1-none/release/initai_spatial_attestation.wasm

# Option B — plain cargo:
cargo build --target wasm32v1-none --release
```

## Test

Unit tests run against the in-process Soroban environment:

```bash
cargo test
```

Covered behavior: attest/verify roundtrip (incl. metadata + `prev_hash` correctness),
unknown-hash → `None`, duplicate-hash rejection, independence across
hashes/submitters, authorization enforcement (fails without a signature),
explicit single-signature mock, and **revision chain** (`prev_hash` links,
unknown-prev rejection, report_id mismatch rejection, cross-wallet revision).

## Deployment (Stellar Testnet) — DONE (v2 with `prev_hash`)

| | |
|---|---|
| **Network** | Stellar Testnet (`--network testnet`, Soroban RPC `https://soroban-testnet.stellar.org`) |
| **Contract ID** | `CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4` |
| **Deployed** | 2026-08-31 · stellar-cli 28.0.0 · wasm32v1-none release 28,844 bytes (wasm hash `19f8b4bddb717f60aa70116e0c6c0e86e45e3488f0d307dafa277c8534ba210e`) |
| **Explorer** | https://stellar.expert/explorer/testnet/contract/CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4 |
| **Deploy tx** | https://stellar.expert/explorer/testnet/tx/b1e1f808ba59e09affe25fe0bb07e9317736c0cdc16d80700b74bfc57ba22e0f |
| **WASM upload tx** | https://stellar.expert/explorer/testnet/tx/fcda513e2e28a59a1bd266c8bd1ff0a3ad036a62fde46441584b5b01f7bcb530 |
| **Previous contract** | `CBQSI2TXAXWNRBPFT457JVH5IUVWKR72XMNQFTSPHDUWRRV76SBDUBXF` (2026-08-24, superseded) |

### Deploy command (as executed)

```bash
# Identity lives ONLY in ~/.config/stellar/identity/initai-deployer.toml.
# Secrets are never committed or shared; only the public key is documented:
#   GBBU32EB3VNOIGDS6GUJ6JWWONQ6NP73BRG6IVE5D4BV3LCTYEJJFAHY

stellar keys generate initai-deployer --network testnet
curl -s "https://friendbot.stellar.org?addr=$(stellar keys address initai-deployer)"

stellar contract deploy \
    --wasm contracts/soroban/target/wasm32v1-none/release/initai_spatial_attestation.wasm \
    --source initai-deployer \
    --network testnet
# → CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4 (2026-08-31, wasm 19f8b4..., 28,844 bytes)
# previous → CBQSI2TXAXWNRBPFT457JVH5IUVWKR72XMNQFTSPHDUWRRV76SBDUBXF (2026-08-24, wasm 59d63c..., 26,688 bytes)
```

To redeploy an updated WASM, rerun `stellar contract deploy …` — you get a
NEW contract id (Soroban deploys are immutable); update
`VITE_STELLAR_CONTRACT_ID` accordingly.

## Invoke / test on-chain

Reads are free and simulate without submitting:

```bash
CID=CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4

stellar contract invoke --id $CID --source-account $(stellar keys address initai-deployer) --network testnet -- total_attestations
stellar contract invoke --id $CID --source-account $(stellar keys address initai-deployer) --network testnet \
    -- verify --hash aa…aa        # 64 hex chars
```

Writes need a funded identity as signer (deployer shown here; the app will
instead use the user's Freighter wallet):

```bash
DEPLOYER=$(stellar keys address initai-deployer)

# First version (no previous):
stellar contract invoke --id $CID --network testnet \
    --source initai-deployer \
    -- attest --submitter $DEPLOYER --hash <64-hex> --report_id "<report-id>"

# Revision (links to previous version's hash):
stellar contract invoke --id $CID --network testnet \
    --source initai-deployer \
    -- attest --submitter $DEPLOYER --hash <new-64-hex> --report_id "<report-id>" --prev_hash <prev-64-hex>
# Or omit --prev_hash for first version (maps to Option::None)
```

Smoke test performed at deployment time (hash = 0xaa×32,
`report_id="smoke-test"`): attest tx
`66a6900a24fa4851a5730352af35e1bf5ca8e963ee2fb6d712e7202fd75318f6` (`prev_hash: null`),
revision `bbbb...` → tx `48f4128e7973a15104de3560aade97d6994a0ff0e15b3459dd1915cb1d1c6985` (`prev_hash: aaaa...`),
`verify` returns full records with `prev_hash` chain, `total_attestations` → 2.

---

## Repository layout

```
contracts/soroban/
├── Cargo.toml        # soroban-sdk 27.x, cdylib+rlib, release opt-level "z"
├── src/
│   ├── lib.rs        # SpatialAttestationRegistry + Attestation types
│   └── test.rs       # unit tests (in-process Soroban env)
└── tests/            # reserved for cross-crate/integration tests
```

## Database persistence (Phase 6)

Attestations are stored off-chain in PostgreSQL (`report_attestations`
table — migration 0008 + 0009; never duplicated report content):

| Column | Notes |
|---|---|
| `report_id` | FK → reports.id (CASCADE), indexed |
| `stellar_hash` | 64-hex SHA-256, **unique** per proof |
| `prev_hash` | 64-hex SHA-256 of previous version, **null** for first version — mirrors on-chain `prev_hash` |
| `tx_hash` | 64-char Stellar tx hash |
| `contract_id` | Soroban contract id (C…) |
| `network` | `testnet` (policy-enforced) |
| `wallet` | submitting account (G…) |
| `status` | pending / confirmed / failed / verified |
| `meta`, `last_verified_at`, `created_at` | verification metadata |

APIs:

```
GET  /api/reports/{id}/attestation-message   → server hash + canonical payload
GET  /api/reports/{id}/attestation           → proof history for one report (public, includes prevHash)
POST /api/reports/{id}/attestation           → persist after confirmation
     body { reportHash, prevHash?, txHash, contractId, network, wallet, meta? }
     · auth required
     · 409 when reportHash ≠ server-computed hash (report edited after signing)
     · 422 when prevHash references unknown attestation or different report_id
     · idempotent: same hash updates pointers instead of duplicating
     · prevHash is validated on-chain (must exist + same report_id) and off-chain

GET  /api/stellar/attestation/{report_hash}  → public proof lookup by hash
     → { stellarHash, txHash, contractId, network, wallet, status,
         createdAt, reportId, reportTitle, matchesCurrentContent }
     · 404 when unknown; matchesCurrentContent=false ⇒ report edited since
```

Live record: report #7 is attested on Testnet — hash `923ab672…507a4`,
tx `431266e6…40b89`, ledger 4309716.

## Report hashing (Phase 5) — server-authoritative

The hash that goes on-chain is computed **by FastAPI from the stored
database row**, so it can't drift from what's actually persisted:

```
GET /api/reports/{id}/attestation-message
→ {
    "reportId": "7",
    "hash": "923ab672b27d2dbd805a…",          ← SHA-256, 64 hex chars
    "canonicalPayload": "{\"area\":\"…\"…}"   ← exact bytes that were hashed
  }
```

- **Canonical payload** = the frontend `ReportPayload` field set
  (title/type/status/area/city/coverage/periodStart/periodEnd/preparedBy/
  autoPriorityAreas/datasets/areas/sections/recommendations + the eight
  dataset summary numbers + generatedAt), rebuilt key-for-key from the DB row
  in `backend/app/services/report_hash.py`. Report `id` and DB timestamps are
  excluded — proofs cover content only.
- **Determinism rules** (matching browser `JSON.stringify`):
  sorted keys · compact separators · raw UTF-8 (`ensure_ascii=False`) ·
  integral floats normalized to ints so Python `36.0` ≡ JS `36`.
- Editing a report changes its content → next hash differs → old on-chain
  proof no longer matches (that is exactly the tamper-evidence working).
- Tests: `backend/tests/test_report_hash.py` — determinism, content-change,
  id-independence, float normalization, known-vector, unicode.
  Run: `python tests/test_report_hash.py` from `backend/`.

The frontend hook accepts this server hash directly
(`useStellarAttestation().attest({ reportHash, reportRef })`); local hashing
remains only as an offline fallback.

## Frontend integration layer (Phase 4)

Adapted to this repo's conventions — `src/services/` for plain logic,
`src/hooks/` for React state:

| File | Responsibility |
|---|---|
| `src/types/stellar.ts` | `ChainAttestation`, `AttestationPhase`, explorer helpers |
| `src/services/stellar/client.ts` | Feature flag (`VITE_STELLAR_ENABLED` + contract id), Testnet RPC URL/passphrase, lazy `getServer()` |
| `src/services/stellar/wallet.ts` | Freighter via StellarWalletsKit v2: connect / disconnect / address / network check / transaction signing |
| `src/services/stellar/attestation.ts` | Canonical JSON → SHA-256 → Soroban `attest` invoke → confirmation polling → on-chain `verify` reads |
| `src/hooks/useStellarWallet.ts` | Wallet session state (persisted address, connect/disconnect) |
| `src/hooks/useStellarAttestation.ts` | Full flow state machine: `idle → hashing → connecting → signing → submitting → confirming → verified` |

Usage sketch (Phase 5 wires this into ReportEditor):

```ts
const att = useStellarAttestation();
await att.attest(buildReportPayload(report), String(report.id));
// att.phase, att.result.txHash, att.chainRecord
```

Implementation notes:

- Package is **`@creit.tech/stellar-wallets-kit`** (the kit moved off the old
  `@creit-tech` scope); current version 2.5.0. Freighter ships as a subpath
  export: `@creit.tech/stellar-wallets-kit/modules/freighter`.
- On Windows, install with `npm i --ignore-scripts …` once: a nested Trezor
  dependency runs a `yarn setup || true` postinstall that fails under cmd.exe.
- Both Stellar packages are **dynamically imported**, so they never enter the
  main bundle and can be dropped later without touching unrelated code.
- Signing requires Freighter set to **Testnet**; the wallet service checks the
  selected network before requesting signatures and surfaces an actionable
  message otherwise.
- Errors are humanized in one place (`normalizeWalletError`): declined
  signature, missing/locked extension, network mismatch, unfunded account.

## Verification (Phase 9)

`useStellarVerification(reportHash)` asks the Soroban contract directly
(free simulated read — no wallet needed) and reduces the answer to three
non-technical outcomes rendered inside the report panel:

| Outcome | User sees |
|---|---|
| `valid` | ✓ "Confirmed on the Stellar Testnet blockchain — this exact report form is permanently recorded." |
| `none` | "This report version has not been recorded on Stellar yet." |
| `error` | "We couldn't reach the Stellar network just now." + Try again |

Implementation notes:
- Read calls use a fixed throwaway G-account as simulation source — contract
  IDs (`C…`) are not valid `Account` ids.
- SDK v17 exposes simulation output as singular `result.retval`.
- An unknown hash parses to `null` → mapped to `none`, never an error.

## Security model (Phase 10)

| Rule | Enforcement |
|---|---|
| No private keys in source / env | Keys live only in Freighter (browser) or the local stellar-cli identity dir. Repo greps clean; frontend env carries only public values (`VITE_API_URL`, flag, contract ID). |
| Testnet only | RPC URL + passphrase hardcoded to Testnet; schema validator rejects any `network ≠ "testnet"` (422). |
| Authoritative hash from DB | `attestation_hash()` computes from the stored row — client content never influences it. Client-supplied hashes are *compared*, not trusted (409 on mismatch). |
| No fabricated transactions | `POST …/attestation` verifies via Horizon that the tx exists, succeeded, invokes **this contract's** `attest` with exactly the claimed wallet + hash + report ref (pure-stdlib XDR param matching — see `services/stellar_verify.py`). Failures → 422. |
| No stealing another report's proof | Hash uniqueness + per-report hash binding + wallet/ref/hash parameter match make cross-report reuse impossible. |
| Auth follows existing system | Writes require the existing cookie session (`get_current_user`); reads stay public like other report GETs. |

Verification metadata persisted per attestation:
`meta = { source, horizon_ledger, verified_via: "horizon", verified_at }`.

## Environment variables (Phase 11)

**Frontend (`VITE_*` — public values only, never secrets):**

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_STELLAR_ENABLED` | Master switch for the integration | `false` |
| `VITE_STELLAR_NETWORK` | Network policy — only `testnet` is supported | `testnet` |
| `VITE_SOROBAN_CONTRACT_ID` | Deployed contract id (SOW name) | — |
| `VITE_STELLAR_CONTRACT_ID` | Legacy alias for the same value | — |
| `VITE_STELLAR_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `VITE_STELLAR_HORIZON_URL` | Horizon REST endpoint | `https://horizon-testnet.stellar.org` |

**Backend (FastAPI settings — verification is pinned server-side):**

| Variable | Purpose | Default |
| --- | --- | --- |
| `STELLAR_CONTRACT_ID` | The contract THIS deployment trusts; client-submitted ids are only cross-checked against it | deployed Testnet contract id |
| `STELLAR_HORIZON_BASE` | Horizon base URL for read-only transaction verification | `https://horizon-testnet.stellar.org` |
| `STELLAR_NETWORK` | Policy network | `testnet` |

No private keys, seed phrases, or signing material exist in any environment
variable — signing happens exclusively in the user's Freighter extension.
See `.env.example` (frontend) and `backend/.env.example` for annotated copies.

## Integration checklist (for Phases 3–4)

- [x] **Deployed to Testnet** — contract id
      `CBQSI2TXAXWNRBPFT457JVH5IUVWKR72XMNQFTSPHDUWRRV76SBDUBXF`
- [x] `.env` / `.env.example`: `VITE_STELLAR_ENABLED`, `VITE_STELLAR_CONTRACT_ID`
      (no secrets in env — wallet keys stay in `~/.config/stellar/`)
- [x] On-chain smoke test passed (attest → verify → total_attestations = 1)
- [x] Frontend deps: `@stellar/stellar-sdk@17`, `@creit.tech/stellar-wallets-kit@2`
- [x] Frontend layer: `services/stellar/*` + `hooks/useStellar*` (flag-gated, lazy-loaded)
- [x] Backend hashing service + `GET /api/reports/{id}/attestation-message`
      (server-authoritative hash, tested)
- [x] Backend columns/table: `report_attestations` (migration 0008, live on Neon)
- [x] Persistence APIs: `POST/GET /api/reports/{id}/attestation` (tested, live)
- [x] Public lookup: `GET /api/stellar/attestation/{hash}` with
      `matchesCurrentContent` integrity flag (tested, live)
- [x] Reports UI: "Verify on Stellar" button + "✓ Verified on Stellar"
      card in ReportEditor (`StellarVerifyPanel.tsx`) with all flow states,
      explorer links, and graceful failure handling (browser-tested)
- [x] Verification tri-state (valid / none / error) straight from the
      contract, with plain-language wording + manual retry
- [ ] Hash source: `buildReportPayload()` output serialized canonically
      (sorted keys, no volatile fields), hashed with WebCrypto SHA-256
- [ ] UI: Verify button states idle → connecting → signing → submitting →
      verified/failed; explorer link
      `https://stellar.expert/explorer/testnet/tx/<tx-hash>`
