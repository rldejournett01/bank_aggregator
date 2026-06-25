"""
Integration tests for the cookie-based auth flow.

These hit the configured database via TestClient. Each test uses a unique email
and cleans up after itself.
"""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.refresh_token import RefreshToken


@pytest.fixture
def email():
    addr = f"pytest_{uuid.uuid4().hex[:10]}@example.com"
    yield addr
    db = SessionLocal()
    u = db.query(User).filter(User.email == addr).first()
    if u:
        db.query(RefreshToken).filter(RefreshToken.user_id == u.id).delete()
        db.delete(u)
        db.commit()
    db.close()


def test_signup_sets_cookies_and_authenticates(email):
    c = TestClient(app)
    r = c.post("/auth/signup", json={"email": email, "password": "secret123"})
    assert r.status_code == 200, r.text
    assert "access_token" in c.cookies and "refresh_token" in c.cookies

    me = c.get("/users/me")
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_refresh_rotates_and_detects_reuse(email):
    c = TestClient(app)
    c.post("/auth/signup", json={"email": email, "password": "secret123"})
    old_refresh = c.cookies.get("refresh_token")

    r = c.post("/auth/refresh")
    assert r.status_code == 200
    new_refresh = c.cookies.get("refresh_token")
    assert new_refresh and new_refresh != old_refresh

    # Replaying the old (now-revoked) token is rejected...
    c.cookies.set("refresh_token", old_refresh)
    assert c.post("/auth/refresh").status_code == 401
    # ...and the whole token family is revoked.
    c.cookies.set("refresh_token", new_refresh)
    assert c.post("/auth/refresh").status_code == 401


def test_logout_clears_session(email):
    c = TestClient(app)
    c.post("/auth/signup", json={"email": email, "password": "secret123"})
    assert c.post("/auth/logout").status_code == 200
    assert c.get("/users/me").status_code == 401


def test_bad_password_rejected(email):
    c = TestClient(app)
    c.post("/auth/signup", json={"email": email, "password": "secret123"})
    r = c.post("/auth/login", data={"username": email, "password": "wrong"})
    assert r.status_code == 401


def test_protected_route_requires_auth():
    c = TestClient(app)
    c.cookies.clear()
    assert c.get("/dashboard/").status_code == 401
