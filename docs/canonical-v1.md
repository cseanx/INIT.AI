# Canonicalization Specification (`initai-canonical-v1`)

**Version:** `initai-canonical-v1` (any future breaking change bumps the version)

**Status:** Week 2 deliverable — exact spec for the SHA-256 hashing pipeline.
Authoritative implementations:

- Reports: `backend/app/services/report_hash.py` (`canonical_report_payload` → `canonical_json` → `attestation_hash`)
- GeoJSON layers: `backend/app/services/geojson_hash.py` (`canonical_geojson` → `geojson_hash`)
- Browser mirror: `src/services/stellar/attestation.ts` (`canonicalize` → `sha256Hex` → `hashReportPayload`)

The same logical report **must** produce the same 64-hex digest on any machine,
in any language (Python backend, JS frontend). Tests enforce this.

---

## 1. Report input (authoritative for attestations)

The report **as stored in the PostgreSQL database** — never client-supplied
content. The backend is the single source of truth.

### Field set (exactly the frontend `ReportPayload`)

Built from the DB row in `canonical_report_payload()` (`backend/app/services/report_hash.py:41-67`):

```text
title, type, status, area, city, coverage, periodStart, periodEnd,
preparedBy, autoPriorityAreas, datasets, areas, sections, recommendations,
avgSurfaceTemp, peakTemp, peakArea, criticalCount, highCount, moderateCount,
avgCanopy, mitigationProjects, generatedAt
```

Excluded on purpose: database `id`, `created_at`, `barangay_id`, and any
DB-side metadata — the proof covers **report content only**. Editing any
listed field changes the digest; editing nothing keeps it stable.

`prev_hash` (on-chain revision link, `contracts/soroban/src/lib.rs:41`) is
**not** part of the hashed payload — it links versions, it does not define
them. Each version hashes independently.

### Serialization rules

1. Object keys sorted alphabetically, recursively (arrays keep order).
2. JSON compact — no spaces (`separators=(',', ':')` in Python, manual
   `canonicalize()` in JS mirrors `JSON.stringify` compact output).
3. Text raw UTF-8; non-ASCII **not** escaped (`Muñoz`, not `Mu\u00f1oz`) —
   `ensure_ascii=False` in Python, `TextEncoder` in JS.
4. Whole-number floats as integers (`36`, never `36.0`) — `_num()` in Python
   (`report_hash.py:33-38`), JS numbers already serialize this way.
5. Timestamps ISO-8601 UTC (`_iso()` normalizes naive datetimes as UTC).
6. Digest = `SHA-256` over exact UTF-8 bytes, rendered 64 lowercase hex.

Equivalent expressions:

```python
# Python (authoritative)
hashlib.sha256(
    json.dumps(payload, sort_keys=True, separators=(",", ":"),
               ensure_ascii=False).encode("utf-8")
).hexdigest()
```

```ts
// JS mirror (offline fallback; server hash wins when online)
await sha256Hex(canonicalize(payload))
```

### Test vectors

`backend/tests/test_report_hash.py` (6 vectors):

| # | Vector | Asserts |
|---|---|---|
| 1 | determinism | same input → same digest, 64 chars |
| 2 | content-change | edited `recommendations` → different digest |
| 3 | id-independence | `id=1` vs `id=999` → same digest |
| 4 | integral-float | `36.0` == `36` in canonical JSON |
| 5 | known-digest | manual `hashlib.sha256` == `attestation_hash`, spot-check `"avgSurfaceTemp":36.5`, starts `{"area":"` |
| 6 | unicode | `Muñoz, José` raw UTF-8, stable hash |

Run: `python -m pytest tests/test_report_hash.py -q` (from `backend/`).

---

## 2. GeoJSON annex (layer-data provenance)

**Scope:** `backend/app/services/geojson_hash.py`. Reports hash `ReportPayload`
whose `areas` field is *derived* from GeoJSON layers (e.g. LST
`FeatureCollection` in `src/components/map/lstData.ts`). Raw GeoJSON,
imagery, and LST grids are **never** placed on-chain (`README.md` trust
boundary) — this annex hashes them off-chain for provenance (future: prove
which grid a summary was derived from).

### Rules (extends §1)

1. Same as §1 (sorted keys, compact, raw UTF-8, integral floats → ints).
2. **Coordinates rounded to 6 decimals** (~11 cm) — absorbs float noise
   across languages (`121.1800000001` → `121.18`). Applies inside
   `coordinates` and `bbox` arrays only; other numbers follow §1.
3. `FeatureCollection.features` order preserved (arrays keep order).

### Test vectors

`backend/tests/test_geojson_hash.py` (9 vectors): determinism,
key-order independence, content-change, coordinate rounding, integral-float
(`[121,14.62]` not `[121.0,...]`), known-digest, unicode, `hash_of_str`
roundtrip, invalid-JSON `ValueError`.

Run: `python -m pytest tests/test_geojson_hash.py -q`.

Endpoint: `POST /api/stellar/geojson-hash` (`backend/app/api/stellar.py`) —
accepts arbitrary GeoJSON, returns `{canonicalJson, hash}`. Public, no auth.

---

## 3. Cross-language equivalence

| Concern | Python | JS |
|---|---|---|
| Key sorting | `sort_keys=True` (recursive) | `canonicalize()` sorts `Object.keys` recursively |
| Compact | `separators=(",", ":")` | manual `join(",")`, no spaces |
| UTF-8 | `ensure_ascii=False` + `.encode("utf-8")` | `TextEncoder` (UTF-8) + `crypto.subtle.digest` |
| `36.0` → `36` | `_num()` | native (`JSON.stringify(36.0) === "36"`) |
| Coordinates | `round(x, 6)` in `coordinates`/`bbox` | same rule when hashing GeoJSON client-side |

The frontend `hashReportPayload` is an **offline fallback only**. When online,
the server hash from `GET /api/reports/{id}/attestation-message` wins
(`src/components/reports/VerifyReportModal.tsx`), and `POST
/api/reports/{id}/attestation` rejects mismatches with 409
(`backend/app/api/reports.py`).

---

## 4. Worked example

Report row (abbrev.):

```json
{"title":"Q3 Urban Heat Island Summary","city":"Quezon City","avgSurfaceTemp":36.5}
```

Canonical JSON (sorted, compact, UTF-8):

```json
{"area":"Quezon City (All Areas)","autoPriorityAreas":true,"avgCanopy":18.7,...}
```

```text
SHA-256(canonical UTF-8 bytes) → 64 lowercase hex (e.g. `923ab672...` for report 7)
```

Full field example: `backend/tests/test_report_hash.py :: make_report()`.

---

## 5. Versioning

- `initai-canonical-v1` — current. Any change to field set, rounding,
  escaping, or float rules **must** bump to `initai-canonical-v2` and keep
  v1 vectors passing (old proofs must remain verifiable).
- `prev_hash` additions (contract `Option<BytesN<32>>`, DB `prev_hash`
  column, migration `0009`) did **not** change v1 — linkage is metadata,
  not hashed content.
