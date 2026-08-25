"""Tests for the Horizon-based transaction verification service.

Horizon is monkeypatched, so no network access happens in CI.
Run: `python -m pytest tests/test_stellar_verify.py -q`
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402

from app.services import stellar_verify as sv  # noqa: E402

CID = "CBQSI2TXAXWNRBPFT457JVH5IUVWKR72XMNQFTSPHDUWRRV76SBDUBXF"
HASH = "ab" * 32
TX = "cd" * 32
WALLET = "GBBU32EB3VNOIGDS6GUJ6JWWONQ6NP73BRG6IVE5D4BV3LCTYEJJFAHY"


def fake_horizon(monkeypatch, successful=True, include_params=True):
    tx = {"successful": successful,
          "ledger": 123,
          "_links": {"operations": {"href": f"https://horizon-testnet.stellar.org/transactions/{TX}/operations{{?cursor,limit,order}}"}}}
    parameters = []
    if include_params:
        parameters = [
            {"value": sv.scv_address_b64(CID), "type": "Address"},
            {"value": sv.scv_symbol_b64("attest"), "type": "Sym"},
            {"value": sv.scv_address_b64(WALLET), "type": "Address"},
            {"value": sv.scv_bytes_b64(HASH), "type": "Bytes"},
            {"value": sv.scv_string_b64("7"), "type": "Str"},
        ]
    ops = {"_embedded": {"records": [{"type": "invoke_host_function", "parameters": parameters}]}}
    calls = []

    def fake_get(path_or_url, horizon_base=sv.HORIZON_BASE):
        calls.append(path_or_url)
        if path_or_url.startswith("/transactions/") and "/operations" not in path_or_url:
            return tx
        return ops

    monkeypatch.setattr(sv, "_horizon_get", fake_get)
    return calls


def call(**overrides):
    kwargs = dict(
        expected_contract_id=CID,
        expected_hash_hex=HASH,
        expected_report_ref="7",
        expected_wallet=WALLET,
    )
    kwargs.update(overrides)
    return sv.verify_attest_transaction(TX, **kwargs)


def test_valid_transaction_verifies(monkeypatch):
    fake_horizon(monkeypatch)
    meta = call()
    assert meta["verified_via"] == "horizon"
    assert meta["ledger"] == 123


def test_failed_tx_rejected(monkeypatch):
    fake_horizon(monkeypatch, successful=False)
    with pytest.raises(sv.TransactionVerificationError, match="failed on-chain"):
        call()


def test_missing_params_rejected(monkeypatch):
    fake_horizon(monkeypatch, include_params=False)
    with pytest.raises(sv.TransactionVerificationError, match="does not contain"):
        call()


def test_unknown_tx_rejected(monkeypatch):
    def fake_get(path_or_url, horizon_base=sv.HORIZON_BASE):
        if path_or_url.startswith("/transactions/"):
            raise sv.TransactionVerificationError("Transaction not found on Stellar Testnet.")
        return {}
    monkeypatch.setattr(sv, "_horizon_get", fake_get)
    with pytest.raises(sv.TransactionVerificationError, match="not found"):
        call()


def test_wrong_wallet_rejected(monkeypatch):
    fake_horizon(monkeypatch)
    other = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    # scv_address_b64 of an unrelated wallet won't be in the param set.
    with pytest.raises(sv.TransactionVerificationError, match="does not contain"):
        call(expected_wallet=other)


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))