# E2E QA Checklist (Week 4)

**Contract:** `CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4` (Testnet, wasm `19f8b4...`)
**dApp:** https://init-ai-ebon.vercel.app · **API:** https://backend-phi-gray-27.vercel.app/docs
**Date run:** 2026-09-14 · **Runner:** CLI (`stellar 28.0.0`) + dApp (Freighter) + pytest + cargo test

How to re-run: unit suites (`cargo test`, `python -m pytest tests -q` from `backend/`,
`npm run build`), then the live rows below via dApp or `stellar contract invoke`.
Error-copy reference: `docs/rpc-errors.md`. Canonical spec: `docs/canonical-v1.md`.

---

## A. Happy path (must all pass)

| # | Check | Steps | Expected | Result 2026-09-14 |
|---|---|---|---|---|
| A1 | First-version attest (ops wallet) | `attest --submitter GBBU32EB...FAHY --hash 923ab672...507a4 --report_id "7"` (no `--prev_hash`) | tx succeeds, `verify` returns record with `prev_hash: null`, ledger recorded | ✅ tx `14850f04...9f046d1d`, ledger `4670349` |
| A2 | Second report, different wallet | `attest --submitter GAORWFLY...ZWHUZ5J --hash 802d191e...9330e7 --report_id "12"` via `initai-qa-second` | tx succeeds, submitter = second wallet | ✅ tx `21ff47a5...025a0e17`, ledger `4670354` |
| A3 | Third report (multi-report) | `attest --hash 972a6b68...af55ba8 --report_id "2"` (ops) | tx succeeds | ✅ tx `534c1030...ce72aa2`, ledger `4670352` |
| A4 | Revision chain | v1 `aaaa...` → v2 `bbbb...` with `--prev_hash '"aaaa...'"`, same `report_id "smoke-test"` | v2 stores `prev_hash: aaaa...`; `verify(bbbb).prev_hash == aaaa` | ✅ tx `48f4128e...6985`, ledger `4431689` (Week 1) |
| A5 | `total_attestations` | read-only `total_attestations` | `5` (2 synthetic + 3 real) | ✅ `5` |
| A6 | dApp Verify flow (5-state) | Reports → Verify on Stellar → Continue → sign in Freighter → watch preparing → awaiting-signature → submitting → confirming → verifying → success | success panel shows tx link + `Contract-verified on-chain — ledger N` | ✅ flow implemented (`VerifyReportModal.tsx`); live dApp run is operator-driven (see demo script) |
| A7 | Backend persist + lookup | `POST /api/reports/{id}/attestation` then `GET /api/stellar/attestation/{hash}` | `matchesCurrentContent: true` | ✅ covered by `test_attestation_api.py` + `test_stellar_lookup.py` (SQLite) |

---

## B. Error paths (must all show friendly copy, write nothing)

| # | Failure | How to trigger | Expected UI / code | Evidence |
|---|---|---|---|---|
| B1 | Rejected signature | Decline the Freighter prompt | "The signature request was declined in your wallet." + guidance (reopen, nothing submitted) | `wallet.ts:normalizeWalletError`, modal `errorKind: declined`; unit: contract `attest_requires_submitter_authorization` |
| B2 | Missing / locked wallet | No Freighter installed, or locked; or Continue with no wallet | "No Stellar wallet is connected…" / "Freighter … not installed, locked, or unavailable" + connect guidance | modal `no-wallet`; `wallet.ts` missing-wallet branch |
| B3 | Wrong network | Freighter set to Mainnet/Futurenet | "Wallet network mismatch — switch Freighter to Testnet." | `assertTestnetSelected` (`wallet.ts:104-110`) |
| B4 | Unfunded account | Fresh wallet, no friendbot XLM | "Your Stellar account is not reachable on Testnet. Fund it via the friendbot faucet…" | `attestation.ts:86-94` (404 → friendbot); Live: `initai-qa-second` funded via friendbot tx `4dadd4f7...` before A2 |
| B5 | Insufficient XLM (fee) | Drain wallet below fee + storage reserve, then attest | "Insufficient Testnet XLM for the network fee. Fund your wallet via the friendbot…" | `wallet.ts` insufficient-balance branch (Week 3); simulation also surfaces `CONTRACT_ERROR` rather than silent fail |
| B6 | Duplicate hash | Re-attest `923ab672...` for report 7 | Simulation: "already been verified…edit the report…" (`DUPLICATE_HASH`); contract panic `attestation already exists` | contract `lib.rs:84-86`, test `duplicate_hash_is_rejected`, backend `test_simulate_duplicate_maps_code`; modal early-check + catch path |
| B7 | Unknown `prev_hash` | `attest --hash cccc... --report_id "7" --prev_hash '"ffff...'"` | Simulation `HostError (WasmVm, InvalidAction)`; backend `UNKNOWN_PREV` / 422 "attest the previous version first" | Live 2026-08-31: trapped as documented; contract `lib.rs:99`, test `attest_revision_fails_when_prev_unknown` |
| B8 | `prev_hash` wrong report | `attest --hash dddd... --report_id "other-report" --prev_hash '"aaaa...'"` | Simulation trap; backend 409 "must reference the same report_id" | Live 2026-08-31; contract `lib.rs:96`, test `attest_revision_fails_when_prev_report_mismatch` |
| B9 | Fabricated tx hash | `POST /api/reports/{id}/attestation` with invented `txHash` | 422 "does not contain an attest call…" | `stellar_verify.py:170-174`; test `test_missing_params_rejected`, `test_unknown_tx_rejected` |
| B10 | Report edited after signing | Sign hash H1, edit report, then `POST …/attestation` with H1 | 409 "Report hash mismatch…Expected {H2}" | `reports.py:150-159`; test `test_hash_mismatch_is_conflict`; modal post-signing edit detection |
| B11 | RPC unreachable | Airplane mode / bad RPC URL, then Continue or `POST /stellar/simulate` | Client: "Could not reach the Stellar Testnet (RPC error)…"; backend: 502 `RPC_UNREACHABLE` | `attestation.ts:190-194`; `stellar_simulate.py:_rpc_post`; test `test_simulate_rpc_unreachable_502` |
| B12 | Confirmation timeout | Submit then stall network (>90s poll) | "Timed out waiting for Testnet confirmation…might still confirm; check the explorer…" | `attestation.ts:waitForConfirmation` (90s, 3s poll); `wallet.ts` timeout branch |
| B13 | Expired timebounds | Hold signed XDR >120s before submit | Submit/simulation fails → `CONTRACT_ERROR` guidance (retry; fresh `setTimeout(120)`) | `attestation.ts:134-137`; matrix `docs/rpc-errors.md §3` |
| B14 | Simulation failure (generic) | Point at dead contract / stop RPC | "could not be simulated…contract may be unavailable…try again shortly" | `attestation.ts:161-163`; backend `CONTRACT_ERROR` |

---

## C. Regression suites (CI-equivalent, run 2026-09-14)

| Suite | Command | Result |
|---|---|---|
| Contract | `cargo test --manifest-path contracts/soroban/Cargo.toml` | 10 passed (roundtrip, unknown→None, duplicate, independence, auth, mocked sig, 4× revision chain) |
| Backend | `python -m pytest tests -q` (from `backend/`) | 42 passed (report hash 6, geojson 9, attestation API, stellar lookup, stellar verify, xdr-prepare 3, simulate 7) |
| Frontend | `npm run build` (`tsc -b` + vite) | ok, 1062 modules |

---

## D. Known limits (honest, not failures)

- Production backend (`backend-phi-gray-27.vercel.app`) still pins the previous contract until Week 1–3 are pushed + redeployed, so `POST /api/reports/{id}/attestation` for the **new** contract returns 422 `Unknown contract id` until then. On-chain proofs above are independent of backend persistence and remain verifiable via `verify` + explorer.
- Demo video is a script + shot list (`docs/demo-script.md`) until recorded; all flows it describes are implemented and the CLI half is executed above.
- `initai-qa-second` (`GAORWFLY...ZWHUZ5J`) is a QA-owned Testnet wallet (friendbot-funded); its secret lives only in local `~/.config/stellar/identity/` and is never committed.
