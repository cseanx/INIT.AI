# LGU Quickstart Guide (Week 4)

**Audience:** city / municipal environment, planning, or DRRM staff using INIT.AI
to monitor urban heat. No blockchain experience assumed.

**What INIT.AI does for you:** combines satellite-derived heat data, barangay-level
analysis, and AI-assisted insights into reports you can share — with an optional
**wallet-submitted attestation** on Stellar Testnet proving a report existed in an
exact form at an exact time.

> **Terminology (important):** an attestation proves a *wallet submitted* a
> fingerprint of the report. It does **not** certify scientific accuracy,
> completeness, LGU authorization, or signer identity. See README trust boundary.

---

## 1. View heat in your city (5 minutes)

1. Open the dApp: https://init-ai-ebon.vercel.app
2. **Dashboard** — city-wide heat summary (average surface temp, hotspots, canopy).
3. **Heat Map** — spatial heat patterns; zoom to your barangays.
4. **Hotspots** — ranked high-heat areas needing attention.
5. **Canopy Analysis** — where low vegetation may be driving heat.
6. Data today is a clearly labeled prototype/mock while satellite pipelines are
   completed; treat numbers as illustrative, not operational.

## 2. Create a report (10 minutes)

1. Go to **Reports → New Report**.
2. Fill in: title, type (e.g. Heat Assessment), city, coverage (Entire city /
   District / Barangay), period, prepared-by, datasets, areas, sections,
   recommendations. Summary numbers (avg/peak temp, counts, canopy) derive from
   current INIT.AI datasets automatically.
3. **Save.** The report is stored in the app database and appears in the table.

## 3. Verify a report on Stellar (optional, 5 minutes)

Use this when you need to prove *this exact version* existed at a point in time
(e.g. attach to a memo, share with a partner).

1. Install **Freighter** (browser extension) and switch it to **Testnet**.
2. Get free Testnet XLM from the friendbot faucet (the app links it when your
   balance is missing — Testnet XLM has no monetary value).
3. Connect your wallet via the wallet indicator in the app header.
4. In **Reports**, click **Verify on Stellar** on your report → **Continue**.
5. Walk the 5 states: **Preparing → Awaiting signature → Submitting →
   Confirming → Verifying**. Approve the signature in Freighter when prompted.
   - Declined? Nothing is submitted — just reopen and Continue.
   - Already verified? The app tells you and links the existing transaction —
     edit the report to verify a new version.
6. On **success** you get a Stellar Expert transaction link plus on-chain
   confirmation (ledger number, revision info). Anyone can re-check it later:
   open the report and use the verification panel, or share the transaction link.

## 4. After edits: revisions

Editing a report changes its fingerprint, so old proofs no longer match the new
content — that is tamper-evidence working as intended. Verifying the edited
report creates a **new** attestation linked to the previous one (`prev_hash`
revision chain). History stays queryable per report; on-chain records are never
modified or deleted.

## 5. Share + interpret proofs

- Share the **report link** (content) together with the **transaction link**
  (proof). Either alone is incomplete.
- A green verification means: *this exact report form was recorded by this
  wallet at this ledger time.* It does not mean the data is correct — validate
  science through your normal technical review.
- If verification says "no longer matches," the report was edited after
  attestation — review the revision history.

## 6. Troubleshooting (plain language)

| You see | What it means | What to do |
|---|---|---|
| Signature declined | You cancelled in Freighter | Reopen Verify and Continue when ready |
| No wallet connected | Freighter missing/locked | Install/unlock Freighter, switch to Testnet, connect via header |
| Wrong network | Freighter on Mainnet | Switch Freighter to Testnet |
| Not reachable / fund via friendbot | Wallet has no Testnet XLM | Use the friendbot faucet link, then retry |
| Timed out waiting | Testnet slow | Check the explorer — your tx may still land; avoid double-submitting |
| Already verified | This version is attested | Edit the report for a new version, or open the existing tx link |
| Could not be simulated | Network/contract hiccup | Wait a minute and retry; contact the INIT.AI team if persistent |

Technical detail (for your IT staff): hashing spec `docs/canonical-v1.md`,
simulation/error matrix `docs/rpc-errors.md`, QA evidence `docs/qa-checklist.md`,
contract `CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4` (Testnet).
