import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator

load_dotenv()


class Settings(BaseModel):
    # =====================
    # App
    # =====================
    PROJECT_NAME: str = "Bank Aggregator API"
    ENVIRONMENT: str = Field(default="development")

    # =====================
    # Security
    # =====================
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # =====================
    # Plaid
    # =====================
    PLAID_CLIENT_ID: str
    PLAID_SECRET: str
    PLAID_ENV: str

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
    SECRET_KEY=os.getenv("SECRET_KEY"),
    PLAID_CLIENT_ID=os.getenv("PLAID_CLIENT_ID"),
    PLAID_SECRET=os.getenv("PLAID_SECRET"),
    PLAID_ENV=os.getenv("PLAID_ENV", "sandbox"),
)