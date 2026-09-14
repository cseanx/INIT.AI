# Demo Video Script (Week 4)

**Target:** 4–6 minutes, 1080p screen capture with voiceover. All flows below are
implemented; CLI half already executed live (see QA checklist). Record the dApp
half in one sitting on Testnet.

**Status:** script + shot list (this file). Recording + upload link is the one
remaining manual step — replace `Demo video: W.I.P` in README Evidence Index
with the link when published.

---

## Shot 0 — Title (0:00–0:20)

- Overlay: "INIT.AI — AI-powered urban heat intelligence for Philippine cities.
  Monitor urban heat. Verify what matters on Stellar (Testnet)."
- Show: live dApp https://init-ai-ebon.vercel.app + contract on Stellar Expert
  `CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4`.

## Shot 1 — Explore heat (0:20–1:30)

1. Dashboard: point out avg surface temp, hotspot counts, canopy.
2. Heat Map: zoom Quezon City → Payatas hotspot.
3. Hotspots tab: ranked list. Canopy tab: low-cover vs heat correlation.
4. Narration: "Satellite-derived layers, barangay-level analysis. Prototype data
   clearly labeled while pipelines complete."

## Shot 2 — Create a report (1:30–2:30)

1. Reports → New Report → fill Q3-style fields (city Quezon City, barangay
   Payatas, datasets lst/hotspots/canopy) → Save.
2. Show the new row in the reports table (unverified state).

## Shot 3 — Verify on Stellar, 5 states (2:30–4:30, the core)

1. Click **Verify on Stellar** → confirmation shows report hash + revision
   (first version / revision of…) + Testnet + connected wallet.
2. Continue → **Preparing** → Freighter popup appears → approve.
3. **Submitting → Confirming → Verifying** stepper animates.
4. **Success**: tx link + "Contract-verified on-chain — ledger N".
5. Click the Stellar Expert link on camera; show the `attest` invocation
   (submitter, hash, report_id, prev_hash).
6. Narration: "Wallet-submitted attestation — proves this exact form existed at
   this time. Not LGU certification."

## Shot 4 — Tamper-evidence + revision (4:30–5:15)

1. Edit the report's recommendations → verification flips to "no longer matches."
2. Verify again → success with "revision of {prev…}" chip.
3. Narration: "Edits create a new linked attestation; originals are never
   modified."

## Shot 5 — Failure handling montage (5:15–5:45, quick cuts)

- Decline signature → friendly declined state.
- Disconnect wallet → no-wallet guidance.
- Already-verified → existing-tx link (no duplicate spend).

## Shot 6 — Close (5:45–6:00)

- Recap: explore → report → verify → share (report link + tx link).
- Links on screen: dApp, API docs, contract explorer, `docs/lgu-quickstart.md`.
- "Testnet prototype. Wallet-submitted proofs, not official certification."

---

## Recording checklist

- [ ] Freighter on Testnet, funded via friendbot (show faucet if empty)
- [ ] `VITE_STELLAR_ENABLED=true`, contract `CDYHVMV...GQ4` (header shows Testnet indicator)
- [ ] Fresh report (unverified) for the live attestation
- [ ] Second report pre-edited for the revision demo
- [ ] Explorer tabs pre-opened (contract + a prior tx) to avoid dead air
- [ ] 1080p, system audio off, mic on; export MP4 + upload (YouTube unlisted/Loom)
