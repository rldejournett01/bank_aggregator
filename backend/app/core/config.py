import os
from dotenv import load_dotenv
from pydantic import BaseModel, field_validator

load_dotenv()


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


class Settings(BaseModel):
    # =====================
    # App
    # =====================
    PROJECT_NAME: str = "Bank Aggregator API"
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"

    # =====================
    # Database
    # =====================
    DATABASE_URL: str = "postgresql://localhost/bank_aggregator"

    # =====================
    # Security / JWT
    # =====================
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # =====================
    # Auth cookies
    # =====================
    # In production set COOKIE_SECURE=true and, for cross-site frontends,
    # COOKIE_SAMESITE=none. Defaults are dev-friendly (http localhost).
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: str | None = None

    # =====================
    # Encryption (Fernet)
    # =====================
    FERNET_KEY: str

    # =====================
    # Plaid
    # =====================
    PLAID_CLIENT_ID: str
    PLAID_SECRET: str
    PLAID_ENV: str
    PLAID_WEBHOOK_URL: str | None = None

    # =====================
    # Stripe (billing) — optional; premium upgrade is disabled if unset
    # =====================
    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None
    STRIPE_PRICE_ID: str | None = None

    # =====================
    # Anthropic (AI advisor) — optional; advisor disabled if unset
    # =====================
    ANTHROPIC_API_KEY: str | None = None
    ANTHROPIC_MODEL: str = "claude-opus-4-8"

    @field_validator("PLAID_ENV")
    def map_plaid_env(cls, value: str) -> str:
        env_map = {
            "sandbox": "https://sandbox.plaid.com",
            "development": "https://development.plaid.com",
            "production": "https://production.plaid.com",
        }
        if value not in env_map:
            raise ValueError(
                "PLAID_ENV must be one of: sandbox, development, production"
            )
        return env_map[value]


settings = Settings(
    ENVIRONMENT=os.getenv("ENVIRONMENT", "development"),
    FRONTEND_URL=os.getenv("FRONTEND_URL", "http://localhost:3000"),
    DATABASE_URL=os.getenv("DATABASE_URL", "postgresql://localhost/bank_aggregator"),
    SECRET_KEY=os.getenv("SECRET_KEY"),
    ACCESS_TOKEN_EXPIRE_MINUTES=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")),
    REFRESH_TOKEN_EXPIRE_DAYS=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")),
    COOKIE_SECURE=_as_bool(os.getenv("COOKIE_SECURE"), default=False),
    COOKIE_SAMESITE=os.getenv("COOKIE_SAMESITE", "lax"),
    COOKIE_DOMAIN=os.getenv("COOKIE_DOMAIN") or None,
    FERNET_KEY=os.getenv("FERNET_KEY"),
    PLAID_CLIENT_ID=os.getenv("PLAID_CLIENT_ID"),
    PLAID_SECRET=os.getenv("PLAID_SECRET"),
    PLAID_ENV=os.getenv("PLAID_ENV", "sandbox"),
    PLAID_WEBHOOK_URL=os.getenv("PLAID_WEBHOOK_URL") or None,
    STRIPE_SECRET_KEY=os.getenv("STRIPE_SECRET_KEY") or None,
    STRIPE_WEBHOOK_SECRET=os.getenv("STRIPE_WEBHOOK_SECRET") or None,
    STRIPE_PRICE_ID=os.getenv("STRIPE_PRICE_ID") or None,
    ANTHROPIC_API_KEY=os.getenv("ANTHROPIC_API_KEY") or None,
    ANTHROPIC_MODEL=os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8"),
)
