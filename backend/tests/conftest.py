"""Lightweight stand-ins so the pure-logic tests need no database."""
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
