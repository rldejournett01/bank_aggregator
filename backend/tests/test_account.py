"""Integration tests for account management, data-rights, health, and headers."""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.refresh_token import RefreshToken
from tests.conftest import signup_body


@pytest.fixture
def email():
    addr = f"acct_{uuid.uuid4().hex[:10]}@example.com"
    yield addr
    db = SessionLocal()
    u = db.query(User).filter(User.email == addr).first()
    if u:
        db.query(RefreshToken).filter(RefreshToken.user_id == u.id).delete()
        db.delete(u)
        db.commit()
    db.close()


def test_health_endpoint():
    c = TestClient(app)
    r = c.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_security_headers_present():
    c = TestClient(app)
    r = c.get("/")
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("X-Frame-Options") == "DENY"
    assert r.headers.get("Referrer-Policy") == "no-referrer"


def test_change_password_flow(email):
    c = TestClient(app)
    c.post("/auth/signup", json=signup_body(email))

    # wrong current password is rejected
    assert c.post("/auth/change-password",
                  json={"current_password": "nope", "new_password": "newpass12"}).status_code == 400
    # too-short new password is rejected
    assert c.post("/auth/change-password",
                  json={"current_password": "secret123", "new_password": "short"}).status_code == 400
    # valid change keeps this session alive
    assert c.post("/auth/change-password",
                  json={"current_password": "secret123", "new_password": "newpass12"}).status_code == 200
    assert c.get("/users/me").status_code == 200
    # old password no longer works; new one does
    fresh = TestClient(app)
    assert fresh.post("/auth/login", data={"username": email, "password": "secret123"}).status_code == 401
    assert fresh.post("/auth/login", data={"username": email, "password": "newpass12"}).status_code == 200


def test_export_returns_full_shape(email):
    c = TestClient(app)
    c.post("/auth/signup", json=signup_body(email))
    r = c.get("/users/me/export")
    assert r.status_code == 200
    body = r.json()
    assert body["profile"]["email"] == email
    for key in ("linked_institutions", "accounts", "transactions", "net_worth_history"):
        assert key in body


def test_logout_all_revokes_session(email):
    c = TestClient(app)
    c.post("/auth/signup", json=signup_body(email))
    assert c.post("/auth/logout-all").status_code == 200
    assert c.get("/users/me").status_code == 401


def test_delete_account_erases_user(email):
    c = TestClient(app)
    c.post("/auth/signup", json=signup_body(email))
    assert c.delete("/users/me").status_code == 200
    assert c.get("/users/me").status_code == 401
    db = SessionLocal()
    assert db.query(User).filter(User.email == email).first() is None
    db.close()
