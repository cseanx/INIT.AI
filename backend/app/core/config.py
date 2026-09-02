"""Application settings loaded from environment variables / .env."""

from pydantic_settings import BaseSettings, SettingsConfigDict


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
    # Frontend and API live on different sites (init-ai-ebon.vercel.app vs
    # backend-phi-gray-27.vercel.app), so the cookie must be SameSite=None +
    # Secure — "lax" is silently dropped by browsers on cross-site fetches,
    # which made every refresh log the user out.
    session_cookie_secure: bool = True
    session_cookie_samesite: str = "none"

    # Login attempt guard: lock out an IP + email after too many failures,
    # so repeated wrong logins stop burning expensive Argon2 verifications.
    login_max_attempts: int = 5
    login_window_seconds: int = 900
    login_lockout_seconds: int = 30

    # Stellar attestation verification (Testnet only by policy).
    # The backend pins the expected contract id: client-submitted contract
    # ids are ignored, so proofs can only be recorded against the contract
    # THIS deployment trusts. Horizon is queried read-only; no keys here.
    stellar_contract_id: str = "CDYHVMVLSKZ4IMVO7DICAJYNVUZMMV6DD252IL2WPWKSX4NC2YII5GQ4"
    stellar_horizon_base: str = "https://horizon-testnet.stellar.org"
    stellar_network: str = "testnet"

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

    # LST raster — GEE (A) primary, TiTiler COG (B fallback)
    # Honest LST 15→45°C for PH urban heat (INIT.AI palette)
    lst_min_c: float = 15.0
    lst_max_c: float = 45.0
    lst_tile_cache_ttl_seconds: int = 600
    lst_hourly_enabled: bool = True
    openweather_api_key: str | None = None
    himawari_enabled: bool = False
    # GEE (A) — set in Vercel env or backend/.env for real LST. Leave unset → B fallback.
    gee_service_account_json: str | None = None  # full JSON string or path
    gee_project_id: str | None = None
    gee_enabled: bool = False
    # TiTiler (B) — public demo, no key, uses Landsat PDS COG. Disable to force 204 when GEE down.
    titiler_enabled: bool = True
    titiler_base_url: str = "https://titiler.xyz"

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
