# Simulation Results + RPC Error-State Handling (Week 2)

**Scope:** transaction simulation (`server.prepareTransaction` client-side,
`POST /api/stellar/simulate` backend proxy) and structured RPC error handling
for `SpatialAttestationRegistry.attest` on Stellar Testnet.

Implementations:

- Client: `src/services/stellar/attestation.ts` (`prepareSignedAttestation`,
  `submitSignedAttestation`, `waitForConfirmation`) + `src/services/stellar/wallet.ts`
  (`normalizeWalletError`)
- Backend: `backend/app/services/stellar_simulate.py` (`simulate_transaction`,
  `StellarRpcError`, `_classify_simulation_error`) + `backend/app/services/stellar_verify.py`
  (Horizon post-confirmation check) + `backend/app/api/stellar.py` (`POST /simulate`)
- Contract: `contracts/soroban/src/lib.rs` (panics are the simulation signals)

---

## 1. Simulation flow

```text
Frontend
  1. GET /api/reports/{id}/xdr-prepare → {hash, prevHash, contractId, args}
     (server-authoritative; backend/app/api/reports.py)
  2. Build unsigned XDR: contract.call('attest', submitter, hash, report_id, prev)
     (src/services/stellar/attestation.ts :: prepareSignedAttestation)
  3. server.prepareTransaction(tx) — Soroban RPC simulation, fills footprint/resources
     → on success: Freighter signs → server.sendTransaction → poll getTransaction
     (confirming) → fetchChainAttestation verify(hash) readback (verifying, Week 3)
     → success shows ledger + prevHash + explorer link
  4. Optional pre-flight: POST /api/stellar/simulate {xdr} → {ok, code, message}
     (backend/app/services/stellar_simulate.py proxies Soroban RPC simulateTransaction)

Backend (after confirmation)
  5. POST /api/reports/{id}/attestation → verify_attest_transaction via Horizon
     (backend/app/services/stellar_verify.py) — exists, succeeded, invokes this
     contract's attest with exact wallet/hash/report_ref/prev_hash
```

The backend **never** builds the full XDR envelope (needs source-account
sequence from RPC + user signing; backend holds no keys by policy). The
`xdr-prepare` endpoint is the honest form of "unsigned XDR preparation":
authoritative parameters, client-side envelope assembly.

---

## 2. Structured codes

Backend `POST /api/stellar/simulate` returns `{ok, code, message, data}`.
`code` is stable for UI mapping and tests (`backend/tests/test_stellar_simulate.py`).

| `code` | Meaning | HTTP | User message (source of truth) |
|---|---|---|---|
| `OK` | simulation succeeded | 200 | "Simulation succeeded — the transaction is ready to sign." |
| `DUPLICATE_HASH` | contract panic `attestation already exists` | 200 (`ok:false`) | "This report has already been verified on Stellar Testnet. Each report version can only be attested once — edit the report to create a new version to verify." |
| `UNKNOWN_PREV` | panic `prev_hash references unknown attestation` | 200 (`ok:false`) | "The previous version has not been attested yet — attest the previous version first, then retry this revision." |
| `REPORT_MISMATCH` | panic `prev_hash must reference same report_id` | 200 (`ok:false`) | "The previous hash belongs to a different report — revisions must link within the same report." |
| `CONTRACT_ERROR` | any other simulation failure | 200 (`ok:false`) | "The attestation transaction could not be simulated on Stellar Testnet. The contract may be unavailable, or the network is unreachable — try again shortly." |
| `INVALID_XDR` | missing/malformed XDR | 422 | "Transaction XDR is missing or malformed." |
| `RPC_UNREACHABLE` | URLError/timeout reaching Soroban RPC | 502 | "Could not reach the Stellar Testnet (RPC error). Check your connection and try again." |
| `RPC_HTTP_ERROR` | RPC non-2xx or bad JSON | 502 | "Stellar RPC returned HTTP {n}." / "Stellar RPC returned invalid JSON." |

Client-side `normalizeWalletError` (`src/services/stellar/wallet.ts:127-177`)
maps wallet/RPC failures to the same user copy (declined signature,
missing/locked Freighter, Testnet mismatch, unfunded account via friendbot).

---

## 3. Full error matrix (where each failure is caught)

| Failure | Caught at | Code / HTTP | Proof |
|---|---|---|---|
| Duplicate hash (same digest attested) | RPC simulation (`prepareTransaction`) + backend simulate proxy | `DUPLICATE_HASH`, 200 `ok:false` | contract `lib.rs:84-86` panic; `attestation.ts:156-160`; `stellar_simulate.py:_classify_simulation_error`; test `test_simulate_duplicate_maps_code` |
| Unknown `prev_hash` | simulation | `UNKNOWN_PREV` | contract `lib.rs:99`; test `test_simulate_unknown_prev_maps_code`; CLI demo (Week 1 redeploy notes) |
| `prev_hash` wrong report | simulation | `REPORT_MISMATCH` | contract `lib.rs:96`; test `test_simulate_report_mismatch_maps_code` |
| Fabricated tx hash | backend Horizon verify | 422 `TransactionVerificationError` | `stellar_verify.py:170-174`; `reports.py:194-205`; test `test_missing_params_rejected` |
| Report edited after signing | backend hash check | 409 mismatch | `reports.py:150-159`; test `test_hash_mismatch_is_conflict` |
| User declines Freighter | client sign | wallet error | `wallet.ts:148-156`; modal `VerifyReportModal.tsx` failed state |
| No wallet / locked | client connect | wallet error | `wallet.ts:157-172` |
| Wrong network | client pre-sign check | wallet error | `wallet.ts:104-110` `assertTestnetSelected` |
| Unfunded account | RPC `getAccount` 404 | friendbot message | `attestation.ts:86-94` |
| RPC unreachable | client submit + backend simulate | `RPC_UNREACHABLE` 502 | `attestation.ts:190-194`; `stellar_simulate.py:_rpc_post`; test `test_simulate_rpc_unreachable_502` |
| Tx fails on-chain | confirmation poll | on-chain error | `attestation.ts:223-225` `FAILED` |
| Confirmation timeout (90s) | poll deadline | timeout message | `attestation.ts:227-229` |
| Horizon lag after confirm | backend retry (3×, 1.2s backoff) | transient, retried | `stellar_verify.py:122-136` |
| Expired timebounds (`setTimeout(120)`) | RPC submit | `CONTRACT_ERROR` / RPC error | `attestation.ts:134-137` (120s); covered by timeout path |

---

## 4. Simulation results (recorded)

### Unit (mocked RPC, CI)

`backend/tests/test_stellar_simulate.py` (7 tests, all passing):

- `test_simulate_ok` — mocked `{"result": {...}}` → `OK`
- `test_simulate_duplicate_maps_code` — `already exists` → `DUPLICATE_HASH`
- `test_simulate_unknown_prev_maps_code` — `prev_hash references unknown` → `UNKNOWN_PREV`
- `test_simulate_report_mismatch_maps_code` — `same report_id` → `REPORT_MISMATCH`
- `test_simulate_rpc_unreachable_502` — transport boom → 502 `RPC_UNREACHABLE`
- `test_simulate_invalid_xdr_422` — short XDR → 422
- `test_geojson_hash_endpoint` — empty FeatureCollection → 64-hex

### Live Testnet (Week 1 redeploy, contract `CDYHVMV...GQ4`)

- `total_attestations` → `2` after smoke tests (read-only simulate + submits).
- v1 `aaaa...` (`prev_hash: null`) → tx `66a6900a...318f6`, ledger `4431681`.
- v2 `bbbb...` (`prev_hash: aaaa...`) → tx `48f4128e...6985`, ledger `4431689`.
- Invalid `prev` (`ffff...` unknown, `dddd...` wrong report) → simulation
  `HostError: Error(WasmVm, InvalidAction)` (contract panics surface as
  `UnreachableCodeReached` at simulation; classified by message when
  available, else `CONTRACT_ERROR`).

Re-run live: build any unsigned `attest` XDR in the dApp (or via
`stellar contract invoke --build-only`), then:

```bash
curl -X POST https://backend-phi-gray-27.vercel.app/api/stellar/simulate \
  -H 'Content-Type: application/json' \
  -d '{"xdr":"<base64-envelope>"}'
# → {"ok":true,"code":"OK",...} or {"ok":false,"code":"DUPLICATE_HASH",...}
```

```bash
curl https://backend-phi-gray-27.vercel.app/api/reports/7/xdr-prepare
# → {"reportId":"7","hash":"...","prevHash":"...","contractId":"CDYHVMV...","args":[...]}
```

```bash
curl -X POST https://backend-phi-gray-27.vercel.app/api/stellar/geojson-hash \
  -H 'Content-Type: application/json' \
  -d '{"geojson":{"type":"FeatureCollection","features":[]}}'
# → {"canonicalJson":"{\"features\":[],\"type\":\"FeatureCollection\"}","hash":"..."}
```

---

## 5. Files

- `backend/app/services/stellar_simulate.py` — proxy + classifier
- `backend/app/api/stellar.py` — `POST /simulate`, `POST /geojson-hash`
- `backend/app/api/reports.py` — `GET /reports/{id}/xdr-prepare`
- `backend/app/schemas/report.py` — `XdrPrepareResponse`
- `backend/tests/test_stellar_simulate.py`, `test_xdr_prepare.py`, `test_geojson_hash.py`
- `docs/canonical-v1.md` — hashing spec (simulation inputs)
