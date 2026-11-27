"""Application settings loaded from environment variables / .env."""

from dataclasses import dataclass
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# The Testnet deployment this repo ships with. Never valid as a Mainnet
# contract id — the settings validator refuses to start in that combination,
# which prevents verifying Mainnet transactions against a Testnet contract.
TESTNET_DEFAULT_CONTRACT_ID = "CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4"

_STELLAR_DEFAULTS = {
    "testnet": {
        "horizon": "https://horizon-testnet.stellar.org",
        "rpc": "https://soroban-testnet.stellar.org",
    },
    "mainnet": {
        "horizon": "https://horizon.stellar.org",
        "rpc": "https://soroban-mainnet.stellar.org",
    },
}


@dataclass(frozen=True)
class StellarNetworkSettings:
    """Resolved settings for one Stellar network (Testnet or Mainnet)."""

    network: Literal["testnet", "mainnet"]
    label: str
    is_mainnet: bool
    contract_id: str
    horizon_url: str
    rpc_url: str
    enabled: bool


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Session cookie
    session_cookie_name: str = "initai_session"
    session_ttl_days: int = 7
    # Frontend and API live on different sites (www.initai.site vs
    # api.initai.site), so the cookie must be SameSite=None +
    # Secure — "lax" is silently dropped by browsers on cross-site fetches,
    # which made every refresh log the user out.
    session_cookie_secure: bool = True
    session_cookie_samesite: str = "none"

    # Login attempt guard: lock out an IP + email after too many failures,
    # so repeated wrong logins stop burning expensive Argon2 verifications.
    login_max_attempts: int = 5
    login_window_seconds: int = 900
    login_lockout_seconds: int = 30

    # Stellar attestation verification (runtime Testnet ↔ Mainnet).
    # The backend pins the expected contract id per network: client-submitted
    # ids are ignored, so proofs can only be recorded against contracts THIS
    # deployment trusts. Horizon is queried read-only; no keys here.
    #
    # `stellar_network` is the primary/default network (also the API default
    # when a request omits `network`). Both networks can be enabled at once so
    # the in-app toggle works; Mainnet needs its contract id AND
    # STELLAR_MAINNET_ACK=true (deliberate opt-in — real XLM moves).
    # Runbook: contracts/soroban/MAINNET-RUNBOOK.md.
    stellar_network: Literal["testnet", "mainnet"] = "testnet"
    # Legacy/primary override. When unset, the per-network id below is used.
    stellar_contract_id: str | None = None
    stellar_testnet_contract_id: str = TESTNET_DEFAULT_CONTRACT_ID
    stellar_mainnet_contract_id: str | None = None
    stellar_mainnet_ack: bool = False
    # Primary-network endpoint overrides (unset = network defaults).
    stellar_horizon_base: str | None = None
    stellar_rpc_url: str | None = None
    # Mainnet-specific overrides used when the toggle targets Mainnet.
    stellar_mainnet_horizon_base: str | None = None
    stellar_mainnet_rpc_url: str | None = None

    @model_validator(mode="after")
    def _validate_stellar_network(self) -> "Settings":
        if self.stellar_mainnet_contract_id:
            if self.stellar_mainnet_contract_id == TESTNET_DEFAULT_CONTRACT_ID:
                raise ValueError(
                    "STELLAR_MAINNET_CONTRACT_ID must not be the Testnet deployment."
                )
            if not self.stellar_mainnet_ack:
                raise ValueError(
                    "STELLAR_MAINNET_CONTRACT_ID requires STELLAR_MAINNET_ACK=true "
                    "(deliberate opt-in: attestations cost real XLM)."
                )
        if self.stellar_network == "mainnet":
            if not self.stellar_mainnet_ack:
                raise ValueError(
                    "STELLAR_NETWORK=mainnet requires STELLAR_MAINNET_ACK=true "
                    "(deliberate opt-in: attestations cost real XLM)."
                )
            mainnet_contract = self.stellar_contract_id or self.stellar_mainnet_contract_id
            if not mainnet_contract or mainnet_contract == TESTNET_DEFAULT_CONTRACT_ID:
                raise ValueError(
                    "STELLAR_NETWORK=mainnet needs a Mainnet contract id "
                    "(STELLAR_CONTRACT_ID or STELLAR_MAINNET_CONTRACT_ID)."
                )
        return self

    @property
    def stellar_network_label(self) -> str:
        """'Testnet' or 'Mainnet' — label of the primary/default network."""
        return "Mainnet" if self.stellar_network == "mainnet" else "Testnet"

    def stellar_contract_for(self, network: str) -> str:
        """Contract id this deployment trusts for `network` ('' when unset)."""
        if network == self.stellar_network and self.stellar_contract_id:
            return self.stellar_contract_id
        if network == "mainnet":
            return self.stellar_mainnet_contract_id or ""
        return self.stellar_testnet_contract_id

    def stellar_config(self, network: str) -> StellarNetworkSettings:
        """Resolve one network's contract, endpoints, and availability."""
        if network not in ("testnet", "mainnet"):
            raise ValueError(f"Unsupported Stellar network: {network!r}")
        is_primary = network == self.stellar_network
        defaults = _STELLAR_DEFAULTS[network]
        is_mainnet = network == "mainnet"
        horizon = (
            self.stellar_horizon_base
            if is_primary and self.stellar_horizon_base
            else self.stellar_mainnet_horizon_base
            if is_mainnet and self.stellar_mainnet_horizon_base
            else defaults["horizon"]
        )
        rpc = (
            self.stellar_rpc_url
            if is_primary and self.stellar_rpc_url
            else self.stellar_mainnet_rpc_url
            if is_mainnet and self.stellar_mainnet_rpc_url
            else defaults["rpc"]
        )
        contract = self.stellar_contract_for(network)
        return StellarNetworkSettings(
            network=network,  # type: ignore[arg-type]
            label="Mainnet" if is_mainnet else "Testnet",
            is_mainnet=is_mainnet,
            contract_id=contract,
            horizon_url=horizon,
            rpc_url=rpc,
            enabled=bool(contract) and (not is_mainnet or self.stellar_mainnet_ack),
        )

    @property
    def stellar_networks(self) -> dict[str, StellarNetworkSettings]:
        return {
            "testnet": self.stellar_config("testnet"),
            "mainnet": self.stellar_config("mainnet"),
        }

    @property
    def stellar_horizon_url(self) -> str:
        return self.stellar_config(self.stellar_network).horizon_url

    @property
    def stellar_rpc_endpoint(self) -> str:
        return self.stellar_config(self.stellar_network).rpc_url

    # Account / email configuration
    frontend_url: str = "http://localhost:5173"
    email_from: str = "noreply@init.ai"
    email_verification_ttl_hours: int = 24
    password_reset_ttl_hours: int = 1
    email_change_ttl_hours: int = 24
    # When true, email content is logged to stdout (development-safe).
    # In production a real SMTP provider can be plugged in via services/email.py
    # without touching this config.
    email_log_enabled: bool = True

    # Testing: allow these demo emails to login without email_verified (admin@init.ai etc.)
    # Comma-separated list, e.g. "admin@init.ai,analyst@init.ai,coordinator@init.ai"
    demo_bypass_emails: str = "admin@init.ai,analyst@init.ai,coordinator@init.ai"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlalchemy_url(self) -> str:
        """DATABASE_URL as given by Neon is `postgresql://...`; force the
        psycopg (v3) driver so the verbatim Neon URL works out of the box."""
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url


settings = Settings()
