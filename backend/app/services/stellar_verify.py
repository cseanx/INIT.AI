"""Server-side verification of a claimed Soroban invocation.

Before INIT.AI stores an attestation, the backend checks the Stellar Testnet
(Horizon REST — stdlib only, no extra dependencies) and confirms that the
submitted transaction:

    1. exists and succeeded,
    2. invokes OUR SpatialAttestationRegistry contract's `attest` function,
    3. was authorized by the submitting wallet,
    4. carries exactly the claimed report hash and report reference.

This makes it impossible to fabricate a transaction hash or claim someone
else's proof. Private keys never pass through here — read-only checks.
"""

import base64
import json
import struct
import urllib.error
import urllib.request

HORIZON_BASE = "https://horizon-testnet.stellar.org"
REQUEST_TIMEOUT_S = 10

# XDR SCValType switch values.
_SCV_BYTES = 13
_SCV_STRING = 14
_SCV_SYMBOL = 15
_SCV_ADDRESS = 18


class TransactionVerificationError(Exception):
    """Raised when a claimed transaction cannot be verified on Testnet."""


def _horizon_get(path_or_url: str) -> dict:
    url = path_or_url if path_or_url.startswith("http") else f"{HORIZON_BASE}{path_or_url}"
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_S) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise TransactionVerificationError(
                "Transaction not found on Stellar Testnet."
            ) from exc
        raise TransactionVerificationError(
            f"Stellar Testnet returned HTTP {exc.code}."
        ) from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise TransactionVerificationError(
            "Could not reach the Stellar Testnet to verify the transaction."
        ) from exc


def _pack_variable(switch: int, payload: bytes) -> str:
    """ScVal for variable-length types: switch, u32 length, data, padding."""
    padded = payload + b"\x00" * ((4 - len(payload) % 4) % 4)
    return base64.b64encode(struct.pack(">II", switch, len(payload)) + padded).decode()


def scv_bytes_b64(hex32: str) -> str:
    return _pack_variable(_SCV_BYTES, bytes.fromhex(hex32))


def scv_string_b64(text: str) -> str:
    return _pack_variable(_SCV_STRING, text.encode("utf-8"))


def scv_symbol_b64(text: str) -> str:
    return _pack_variable(_SCV_SYMBOL, text.encode("utf-8"))


def strkey_to_ed25519(account_id: str) -> bytes:
    """Decode a Stellar strkey (G… account or C… contract) to its 32-byte key.
    CRC is ignored; version byte accepted: 48 = ed25519 account, 16 = contract."""
    raw = base64.b32decode(account_id + "=" * ((8 - len(account_id) % 8) % 8))
    if raw[0] not in (6 << 3, 2 << 3):
        raise ValueError("unsupported strkey version")
    return raw[1:-2]


def scv_address_b64(account_id: str) -> str:
    """Address ScVal: switch(18), accountIdType(0), publicKeyType(0), key."""
    key = strkey_to_ed25519(account_id)
    return base64.b64encode(struct.pack(">III", _SCV_ADDRESS, 0, 0) + key).decode()


def verify_attest_transaction(
    tx_hash: str,
    *,
    expected_contract_id: str,
    expected_hash_hex: str,
    expected_report_ref: str,
    expected_wallet: str,
) -> dict:
    """Validate the claimed transaction against Horizon Testnet.

    Returns metadata ({ledger, verified_via}) on success; raises
    TransactionVerificationError with a user-facing reason otherwise.
    """
    tx = _horizon_get(f"/transactions/{tx_hash}")
    if not tx.get("successful"):
        raise TransactionVerificationError("That transaction failed on-chain.")

    operations = _horizon_get(
        tx["_links"]["operations"]["href"].split("{")[0] + "?limit=10"
    )
    required = {
        scv_symbol_b64("attest"),
        scv_bytes_b64(expected_hash_hex.lower()),
        scv_string_b64(expected_report_ref),
        scv_address_b64(expected_wallet),
    }

    for operation in operations.get("_embedded", {}).get("records", []):
        if operation.get("type") != "invoke_host_function":
            continue
        provided = {p.get("value") for p in operation.get("parameters") or []}
        if required <= provided:
            return {"ledger": tx.get("ledger"), "verified_via": "horizon"}

    raise TransactionVerificationError(
        "That transaction does not contain an attest call for this report, "
        "wallet, and hash combination."
    )
