"""Signup identity fields: required, and server-enforced age gate."""
import uuid
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.refresh_token import RefreshToken
from tests.conftest import signup_body


@pytest.fixture
def email():
    addr = f"kyc_{uuid.uuid4().hex[:10]}@example.com"
    yield addr
    db = SessionLocal()
    u = db.query(User).filter(User.email == addr).first()
    if u:
        db.query(RefreshToken).filter(RefreshToken.user_id == u.id).delete()
        db.delete(u)
        db.commit()
    db.close()


def _dob_for_age(years: int) -> str:
    """A DOB that makes the person exactly `years` old today (safely, no leap-day edge)."""
    d = date.today().replace(year=date.today().year - years)
    if d.month == 2 and d.day == 29:
        d = d.replace(day=28)
    return d.isoformat()


def test_signup_stores_name_and_dob(email):
    c = TestClient(app)
    body = signup_body(email)
    r = c.post("/auth/signup", json=body)
    assert r.status_code == 200, r.text

    me = c.get("/users/me").json()
    assert me["first_name"] == body["first_name"]
    assert me["last_name"] == body["last_name"]


def test_signup_missing_identity_fields_rejected(email):
    c = TestClient(app)
    r = c.post("/auth/signup", json={"email": email, "password": "secret123"})
    assert r.status_code == 422


def test_signup_under_18_rejected(email):
    c = TestClient(app)
    body = signup_body(email)
    body["date_of_birth"] = _dob_for_age(17)
    r = c.post("/auth/signup", json=body)
    assert r.status_code == 422
    assert c.get("/users/me").status_code == 401  # no session was created


def test_signup_exactly_18_accepted(email):
    c = TestClient(app)
    body = signup_body(email)
    body["date_of_birth"] = _dob_for_age(18)
    r = c.post("/auth/signup", json=body)
    assert r.status_code == 200, r.text


def test_signup_future_dob_rejected(email):
    c = TestClient(app)
    body = signup_body(email)
    body["date_of_birth"] = (date.today() + timedelta(days=1)).isoformat()
    r = c.post("/auth/signup", json=body)
    assert r.status_code == 422


def test_signup_blank_name_rejected(email):
    c = TestClient(app)
    body = signup_body(email)
    body["first_name"] = "   "
    r = c.post("/auth/signup", json=body)
    assert r.status_code == 422
