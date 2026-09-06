"""Soroban RPC simulation proxy with structured errors (Week 2).

Frontend already simulates via `server.prepareTransaction()` before asking
Freighter to sign (`src/services/stellar/attestation.ts`). This module gives
the backend the same capability without new dependencies (stdlib `urllib`
only, like `stellar_verify.py`):

  POST /api/stellar/simulate { xdr } -> forwards to Soroban RPC
  `simulateTransaction`, returns a structured result with a stable `code`
  the frontend can map to user-facing copy.

No keys ever pass through here — the XDR is unsigned (or signed but not
submitted). Read-only simulation.

Structured codes (`SimulateCode`):
  OK, DUPLICATE_HASH, UNKNOWN_PREV, REPORT_MISMATCH, CONTRACT_ERROR,
  RPC_UNREACHABLE, RPC_HTTP_ERROR, TIMEOUT, INVALID_XDR, UNKNOWN
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass

RPC_DEFAULT = "https://soroban-testnet.stellar.org"
REQUEST_TIMEOUT_S = 15


class StellarRpcError(Exception):
    """Structured RPC failure with a stable machine-readable code."""

    def __init__(self, code: str, message: str, *, detail: str | None = None):
        super().__init__(message)
        self.code = code
        self.detail = detail


def _rpc_post(rpc_url: str, method: str, params: dict) -> dict:
    """JSON-RPC POST with structured error mapping (stdlib only)."""
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode("utf-8")
    request = urllib.request.Request(
        rpc_url.rstrip("/"),
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_S) as response:
            try:
                return json.loads(response.read().decode("utf-8"))
            except json.JSONDecodeError as exc:
                raise StellarRpcError("RPC_HTTP_ERROR", "Stellar RPC returned invalid JSON.", detail=str(exc)) from exc
    except urllib.error.HTTPError as exc:
        raise StellarRpcError("RPC_HTTP_ERROR", f"Stellar RPC returned HTTP {exc.code}.", detail=str(exc)) from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise StellarRpcError(
            "RPC_UNREACHABLE", "Could not reach the Stellar Testnet (RPC error). Check your connection and try again.", detail=str(exc)
        ) from exc


def _classify_simulation_error(raw: str) -> tuple[str, str]:
    """Map a Soroban simulation failure string to (code, user message)."""
    hay = raw.lower()
    if "already exists" in hay or "already attested" in hay:
        return (
            "DUPLICATE_HASH",
            "This report has already been verified on Stellar Testnet. Each report version can only be attested once — edit the report to create a new version to verify.",
        )
    if "prev_hash references unknown" in hay or "prev_hash" in hay and "unknown" in hay:
        return (
            "UNKNOWN_PREV",
            "The previous version has not been attested yet — attest the previous version first, then retry this revision.",
        )
    if "prev_hash must reference same report" in hay or ("same report" in hay and "prev" in hay):
        return (
            "REPORT_MISMATCH",
            "The previous hash belongs to a different report — revisions must link within the same report.",
        )
    if "attestation already exists" in hay:
        return (
            "DUPLICATE_HASH",
            "This report has already been verified on Stellar Testnet. Each report version can only be attested once — edit the report to create a new version to verify.",
        )
    return (
        "CONTRACT_ERROR",
        "The attestation transaction could not be simulated on Stellar Testnet. The contract may be unavailable, or the network is unreachable — try again shortly.",
    )


@dataclass
class SimulateResult:
    ok: bool
    code: str
    message: str
    # Raw RPC result (cost, footprint, results) when ok; error detail otherwise.
    data: dict | None = None


def simulate_transaction(xdr: str, *, rpc_url: str = RPC_DEFAULT) -> SimulateResult:
    """Simulate an (unsigned) transaction XDR via Soroban RPC.

    `xdr` must be base64 transaction envelope. Returns SimulateResult with
    stable `code` for the frontend error matrix (see `docs/rpc-errors.md`).
    Raises StellarRpcError for transport failures (RPC_UNREACHABLE etc.).
    """
    if not xdr or not isinstance(xdr, str) or len(xdr.strip()) < 16:
        raise StellarRpcError("INVALID_XDR", "Transaction XDR is missing or malformed.")

    payload = _rpc_post(rpc_url, "simulateTransaction", {"transaction": xdr.strip()})

    # JSON-RPC error envelope
    if "error" in payload and payload["error"]:
        err = payload["error"]
        raw = json.dumps(err) if isinstance(err, dict) else str(err)
        code, message = _classify_simulation_error(raw)
        return SimulateResult(ok=False, code=code, message=message, data={"rpcError": err})

    result = payload.get("result", {})
    # Soroban RPC simulation errors surface as result.error (string)
    if isinstance(result, dict) and result.get("error"):
        raw = str(result["error"])
        # Include diagnostic events if present for better classification
        events = result.get("events") or result.get("diagnosticEvents") or ""
        code, message = _classify_simulation_error(raw + " " + json.dumps(events))
        return SimulateResult(ok=False, code=code, message=message, data={"rpcResult": result})

    return SimulateResult(
        ok=True,
        code="OK",
        message="Simulation succeeded — the transaction is ready to sign.",
        data={"rpcResult": result},
    )
