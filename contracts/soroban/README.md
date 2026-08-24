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
    pub hash:            BytesN<32>, // SHA-256 of the canonical report payload
    pub report_id:       String,     // INIT.AI numeric report id, as a short string
    pub submitter:       Address,    // wallet account that signed
    pub ledger_sequence: u32,        // ledger height at attestation
    pub recorded_at:     u64,        // ledger unix timestamp
}

impl SpatialAttestationRegistry {
    /// Record an attestation. Requires `submitter`'s authorization
    /// (wallet signature). Panics if the exact hash was already attested —
    /// one proof per form keeps the registry unambiguous.
    pub fn attest(env, submitter: Address, hash: BytesN<32>, report_id: String) -> Attestation;

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

Covered behavior: attest/verify roundtrip (incl. metadata correctness),
unknown-hash → `None`, duplicate-hash rejection, independence across
hashes/submitters, authorization enforcement (fails without a signature), and
an explicit single-signature mock test.

## Deploy (Testnet)

```bash
# 1) Identity for the deploying/initiating account
stellar keys generate initai-deployer --network testnet
stellar keys address initai-deployer

# 2) Fund it from the Testnet friendbot faucet
curl -s "https://friendbot.stellar.org?addr=<PUBKEY>"

# 3) Install + deploy the WASM
stellar contract deploy \
    --wasm target/wasm32v1-none/release/initai_spatial_attestation.wasm \
    --source initai-deployer \
    --network testnet
#   → prints the deployed Contract ID (C…)

# 4) Sanity-check on-chain
stellar contract invoke \
    --id <CONTRACT_ID> --network testnet \
    --source initai-deployer \
    -- total_attestations
#   → 0
```

The resulting `CONTRACT_ID` is what INIT.AI's frontend uses
(`VITE_STELLAR_CONTRACT_ID`); the flag `VITE_STELLAR_ENABLED` gates all
Stellar code paths so the rest of the app runs unchanged without it.

## Verify from the CLI

```bash
stellar contract invoke \
    --id <CONTRACT_ID> --network testnet \
    -- verify --hash <32-BYTE-HASH-Hex>
```

Or read it programmatically with `@stellar/stellar-sdk`
(`contractClient.verify({ hash })`) — which is what the INIT.AI UI does.

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

## Integration checklist (for Phases 3–4)

- [ ] Frontend deps: `@stellar/stellar-sdk`, `@creit-tech/stellar-wallets-kit`
- [ ] `.env`: `VITE_STELLAR_ENABLED=true`, `VITE_STELLAR_CONTRACT_ID=C…`
- [ ] Backend columns: `stellar_hash`, `stellar_tx_hash`, `stellar_wallet`,
      `stellar_attested_at` on `reports` (+ migration 0008 / ensure.py sync)
- [ ] Hash source: `buildReportPayload()` output serialized canonically
      (sorted keys, no volatile fields), hashed with WebCrypto SHA-256
- [ ] UI: Verify button states idle → connecting → signing → submitting →
      verified/failed; explorer link
      `https://stellar.expert/explorer/testnet/tx/<tx-hash>`
