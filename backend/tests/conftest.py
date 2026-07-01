"""Lightweight stand-ins so the pure-logic tests need no database."""
import os

# Disable the auth rate limiter for the test suite (set before app import).
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

from dataclasses import dataclass
from datetime import date


@dataclass
class FakeTx:
    amount: float
    date: date | None
    description: str
    merchant_name: str | None = None
    category: str | None = None


@dataclass
class FakeAccount:
    account_type: str
    balance: float


def signup_body(email: str, password: str = "secret123") -> dict:
    """A valid /auth/signup payload (adult DOB, real-looking name fields)."""
    return {
        "email": email,
        "password": password,
        "first_name": "Test",
        "last_name": "User",
        "date_of_birth": "1990-01-01",
    }
