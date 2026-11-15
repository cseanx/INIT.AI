"""Network-selection guardrails for the Stellar backend integration.

Mainnet is deliberately opt-in with two switches (STELLAR_NETWORK=mainnet AND
STELLAR_MAINNET_ACK=true) plus a real mainnet contract id. These tests protect
that contract so a typo can never point production at the wrong chain.

Run: `python -m pytest tests/test_stellar_network_config.py -q`
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from pydantic import ValidationError

from app.core.config import Settings

MAINNET_CONTRACT = "C" + "A" * 55


def _settings(**overrides) -> Settings:
    # _env_file=None isolates the test from a developer's backend/.env.
    return Settings(database_url="sqlite://", _env_file=None, **overrides)


def test_defaults_to_testnet():
    settings = _settings()
    assert settings.stellar_network == "testnet"
    assert settings.stellar_network_label == "Testnet"
    assert settings.stellar_horizon_url == "https://horizon-testnet.stellar.org"
    assert settings.stellar_rpc_endpoint == "https://soroban-testnet.stellar.org"


def test_mainnet_requires_explicit_ack():
    with pytest.raises(ValidationError):
        _settings(stellar_network="mainnet")


def test_mainnet_refuses_testnet_contract_id():
    with pytest.raises(ValidationError):
        _settings(stellar_network="mainnet", stellar_mainnet_ack=True)


def test_mainnet_contract_requires_ack_when_toggle_configured():
    with pytest.raises(ValidationError):
        _settings(stellar_mainnet_contract_id=MAINNET_CONTRACT)


def test_dual_network_resolution():
    settings = _settings(
        stellar_mainnet_contract_id=MAINNET_CONTRACT,
        stellar_mainnet_ack=True,
    )
    assert settings.stellar_network == "testnet"
    testnet = settings.stellar_config("testnet")
    mainnet = settings.stellar_config("mainnet")
    assert testnet.enabled and testnet.contract_id.startswith("C")
    assert mainnet.enabled and mainnet.contract_id == MAINNET_CONTRACT
    assert mainnet.horizon_url == "https://horizon.stellar.org"
    assert mainnet.rpc_url == "https://soroban-mainnet.stellar.org"
    assert not settings.stellar_config("testnet").is_mainnet


def test_mainnet_resolves_mainnet_endpoints():
    settings = _settings(
        stellar_network="mainnet",
        stellar_mainnet_ack=True,
        stellar_contract_id=MAINNET_CONTRACT,
    )
    assert settings.stellar_network_label == "Mainnet"
    assert settings.stellar_horizon_url == "https://horizon.stellar.org"
    assert settings.stellar_rpc_endpoint == "https://soroban-mainnet.stellar.org"


def test_explicit_endpoint_overrides_win():
    settings = _settings(
        stellar_horizon_base="https://horizon.internal.example",
        stellar_rpc_url="https://rpc.internal.example",
    )
    assert settings.stellar_horizon_url == "https://horizon.internal.example"
    assert settings.stellar_rpc_endpoint == "https://rpc.internal.example"
