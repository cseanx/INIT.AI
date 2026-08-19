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
    session_cookie_secure: bool = False  # set True behind HTTPS (production)
    # "lax" works when the frontend and API share a site (e.g. both on
    # *.vercel.app); use "none" for cross-site setups (e.g. Vercel + Render).
    session_cookie_samesite: str = "lax"

    # Login attempt guard: lock out an IP + email after too many failures,
    # so repeated wrong logins stop burning expensive Argon2 verifications.
    login_max_attempts: int = 5
    login_window_seconds: int = 900
    login_lockout_seconds: int = 30

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
