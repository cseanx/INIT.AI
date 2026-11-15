# Mainnet Runbook (Stellar)

**Status:** code is Mainnet-capable behind explicit opt-in switches. The contract
is **not deployed to Mainnet yet** — the deployer identity
`GBBU32EB3VNOIGDS6GUJ6JWWONQ6NP73BRG6IVE5D4BV3LCTYEJJFAHY` has no Mainnet
account (Horizon `404`, checked 2026-09-22). Testnet remains the default for
every layer, including the Instawards submission.

This runbook is the only sanctioned path to a Mainnet deployment. Do not skip
steps, and do not flip production to Mainnet for a demo.

---

## 0. Before you spend anything

| Requirement | Why |
|---|---|
| Written LGU/org sign-off that attestations may cost real XLM | Mainnet fees are real money |
| Dedicated Mainnet identity (not the Testnet deployer) | Testnet keys should never hold value |
| Funded Mainnet account (**≥ 20 XLM**, 50+ recommended) | WASM upload + contract creation + storage rent |
| Contract artifact hash recorded | Soroban deploys are immutable; the hash is the audit anchor |
| Decision on who owns the keys (multisig/hardware) | A hot CLI key is acceptable for pilots only |

Costs are small but nonzero: a ~28 KB WASM upload plus one contract creation
typically costs **1–3 XLM** in resource/storage fees at current Mainnet base
fee, plus the small per-operation fee. The 20 XLM guardrail in the deploy script
leaves headroom for retries and later writes.

---

## 1. Build and record the artifact

```powershell
stellar contract build --manifest-path contracts/soroban/Cargo.toml
Get-FileHash -Algorithm SHA256 contracts/soroban/target/wasm32v1-none/release/initai_spatial_attestation.wasm
```

```bash
stellar contract build --manifest-path contracts/soroban/Cargo.toml
sha256sum contracts/soroban/target/wasm32v1-none/release/initai_spatial_attestation.wasm
```

Record the SHA-256 and byte size. They must match what you audit later.

## 2. Create and fund the Mainnet identity

```bash
# Creates a key locally in ~/.config/stellar/identity/. Never commit or paste it.
stellar keys generate initai-mainnet --network mainnet
stellar keys address initai-mainnet
```

Send **real XLM** to that public key from an exchange or custody account.
**5 XLM is enough** — the Testnet deploy of this wasm charged 19,512 stroops
(~0.002 XLM); Mainnet has the same fee structure. Keep a small buffer for the
smoke test and future writes.

Verify:

```bash
curl -s "https://horizon.stellar.org/accounts/$(stellar keys address initai-mainnet)" | head
```

> The backend and frontend never hold this key. It is only used by the CLI for
> deployment and optional admin/read commands. User attestations are signed in
> the user's own Freighter wallet.

## 3. Deploy (guarded)

```powershell
# Windows
.\contracts\soroban\scripts\deploy-mainnet.ps1 -Source initai-mainnet -Confirm
```

```bash
# macOS/Linux equivalent
stellar contract deploy \
  --wasm contracts/soroban/target/wasm32v1-none/release/initai_spatial_attestation.wasm \
  --source initai-mainnet \
  --network mainnet
```

The script refuses to run without `-Confirm`, an identity, a Mainnet-funded
account, the wasm artifact, and at least 20 XLM. On success it prints the new
contract id and the env vars to set.

**Save the output.** Soroban contracts are immutable: a redeploy creates a new
contract id, and old proofs remain on the old contract forever.

## 4. Verify the deployment (read-only, free)

```bash
CID=<new-mainnet-contract-id>

stellar contract invoke --id $CID --network mainnet \
  --source initai-mainnet -- total_attestations
# -> 0

# First attestation smoke test (costs a few stroops):
ADDR=$(stellar keys address initai-mainnet)
HASH=$(printf 'initai-mainnet-smoke' | sha256sum | cut -d' ' -f1)
stellar contract invoke --id $CID --network mainnet --source initai-mainnet \
  -- attest --submitter $ADDR --hash $HASH --report_id "mainnet-smoke"

stellar contract invoke --id $CID --network mainnet \
  --source initai-mainnet -- verify --hash $HASH
```

Record the deploy tx and smoke-test tx hashes in
`contracts/soroban/README.md` and the README Evidence Index.

## 5. Configure the apps (both networks stay enabled)

The app keeps Testnet **and** Mainnet available at the same time; the header
badge toggles between them at runtime. Testnet remains the default. Mainnet is
a **two-key switch** so a typo cannot silently move real money.

### Backend (Vercel `backend-init-ai` → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `STELLAR_NETWORK` | `testnet` (default when a request omits `network`) |
| `STELLAR_TESTNET_CONTRACT_ID` | `CDYHVMV...GQ4` (or leave default) |
| `STELLAR_MAINNET_CONTRACT_ID` | the Mainnet contract id from step 3 |
| `STELLAR_MAINNET_ACK` | `true` (required whenever the Mainnet id is set) |
| `STELLAR_MAINNET_HORIZON_BASE` | optional; defaults to `https://horizon.stellar.org` |
| `STELLAR_MAINNET_RPC_URL` | optional; defaults to `https://soroban-mainnet.stellar.org` |

The backend refuses to start if a Mainnet contract id is present without
`STELLAR_MAINNET_ACK=true`, or if the id equals the Testnet deployment.

### Frontend (Vercel `init-ai` project)

| Variable | Value |
|---|---|
| `VITE_STELLAR_ENABLED` | `true` |
| `VITE_STELLAR_NETWORK` | `testnet` (initial toggle position) |
| `VITE_SOROBAN_CONTRACT_ID` | Testnet contract id (unchanged) |
| `VITE_MAINNET_SOROBAN_CONTRACT_ID` | Mainnet contract id — this enables the toggle's Mainnet side |

`VITE_MAINNET_RPC_URL` / `VITE_MAINNET_HORIZON_URL` can be left unset — the
defaults follow the selected network.

Once both env sets are saved, **redeploy** so the Vite build picks up the new
Mainnet contract id. Until then the toggle shows Mainnet disabled with
"No Mainnet contract configured yet."

## 6. Post-deploy verification

```bash
curl -s https://backend-phi-gray-27.vercel.app/api/health
curl -s "https://backend-phi-gray-27.vercel.app/api/reports/7/xdr-prepare?network=testnet"
curl -s "https://backend-phi-gray-27.vercel.app/api/reports/7/xdr-prepare?network=mainnet"
# -> network: "mainnet", contractId: <mainnet id>, rpcUrl: soroban-mainnet
```

In the dApp:

1. Click the header badge → **Mainnet** becomes selectable and the badge turns
   green. The choice persists across reloads.
2. Freighter must be on **Mainnet**; the wallet check rejects Testnet.
3. Verify a fresh report → explorer link opens
   `stellar.expert/explorer/public/...`.
4. Confirm the persisted row shows `network: "mainnet"`.
5. Switch back to Testnet and confirm reports/attestations still work.

Run the backend suite first (`python -m pytest tests -q`) — the network guard
tests must pass before any env change.

## 7. Rollback

Fastest and safest: remove Mainnet from the toggle and redeploy. Testnet is
untouched.

| Variable | Rollback value |
|---|---|
| `STELLAR_MAINNET_CONTRACT_ID` | unset |
| `STELLAR_MAINNET_ACK` | `false` or unset |
| `STELLAR_NETWORK` | `testnet` (already the default) |
| `VITE_MAINNET_SOROBAN_CONTRACT_ID` | unset |
| `VITE_STELLAR_NETWORK` | `testnet` (already the default) |

The toggle then shows Mainnet disabled; anyone with Mainnet selected in
localStorage falls back to Testnet on next load. Existing Mainnet proofs stay
verifiable on-chain and reappear if you restore the env vars.

**Do not** delete or redeploy the contract as a rollback — that loses the
address reviewers were given.

## 8. Security rules (non-negotiable)

- No secret keys in the repo, in Vercel env, in `VITE_*`, or in chat.
  The only Mainnet signer is the CLI identity on the operator's machine (or a
  hardware/multisig setup).
- The backend is read-only for Stellar: it verifies via Horizon and never signs.
- Keep `STELLAR_NETWORK` at `testnet` for any environment used in demos,
  grading, or Instawards evidence.
- If a key is ever exposed: create a new identity, redeploy only if the contract
  itself must change (the contract has no admin key), rotate env vars, and
  document the incident.

## 9. Known gaps after a Mainnet deploy

- No Mainnet transaction receipts are in the README yet — record them.
- `docs/qa-checklist.md` live rows remain Testnet evidence; add a Mainnet
  parity row with the new tx hashes.
- If a reward token is added later, that is a separate issuance/custody project;
  see the token plan. Do not attach value-bearing assets to this contract.
