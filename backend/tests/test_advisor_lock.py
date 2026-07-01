"""The AI advisor is hard-locked ('coming soon') regardless of premium status."""
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
    addr = f"advlock_{uuid.uuid4().hex[:10]}@example.com"
    yield addr
    db = SessionLocal()
    u = db.query(User).filter(User.email == addr).first()
    if u:
        db.query(RefreshToken).filter(RefreshToken.user_id == u.id).delete()
        db.delete(u)
        db.commit()
    db.close()


def test_status_reports_locked(email):
    c = TestClient(app)
    c.post("/auth/signup", json=signup_body(email))
    r = c.get("/advisor/status")
    assert r.status_code == 200
    assert r.json()["locked"] is True


def test_chat_locked_even_for_premium_user(email):
    c = TestClient(app)
    c.post("/auth/signup", json=signup_body(email))

    db = SessionLocal()
    u = db.query(User).filter(User.email == email).first()
    u.is_premium = True
    db.commit()
    db.close()

    r = c.post("/advisor/chat", json={"message": "How am I doing?", "history": []})
    assert r.status_code == 423
