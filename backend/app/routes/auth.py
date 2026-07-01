import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import jwt  # PyJWT

from app.schemas.user import UserCreate, ChangePassword
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    set_auth_cookies,
    clear_auth_cookies,
    get_current_user,
    REFRESH_COOKIE,
)
from app.core.deps import get_db
from app.core.audit import audit
from app.models.user import User
from app.models.refresh_token import RefreshToken


router = APIRouter(prefix="/auth", tags=["Authentication"])


def _issue_session(response: Response, db: Session, user: User) -> None:
    """Create a refresh-token row and set both auth cookies on the response."""
    jti = uuid.uuid4()
    refresh_token, expires_at = create_refresh_token({"sub": str(user.id)}, str(jti))
    db.add(RefreshToken(id=jti, user_id=user.id, expires_at=expires_at, revoked=False))
    db.commit()

    access_token = create_access_token({"sub": str(user.id)})
    set_auth_cookies(response, access_token, refresh_token)


@router.post("/signup")
def signup(user: UserCreate, response: Response, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(email=user.email, hashed_password=hash_password(user.password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log the user straight in after signup.
    _issue_session(response, db, new_user)
    return {"message": "User created successfully", "id": str(new_user.id)}


@router.post("/login")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    db_user = db.query(User).filter(User.email == form_data.username).first()
    if not db_user or not verify_password(form_data.password, db_user.hashed_password):
        audit("login_failed", request=request, email=form_data.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    _issue_session(response, db, db_user)
    audit("login_succeeded", request=request, user_id=db_user.id)
    return {"status": "authenticated", "id": str(db_user.id)}


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Rotate the refresh token: validate the presented one, revoke it, and issue
    a fresh access + refresh pair. Reuse of an already-revoked token revokes
    the user's entire session family (theft detection).
    """
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        jti = payload.get("jti")
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    row = db.query(RefreshToken).filter(RefreshToken.id == jti).first()

    # Reuse detection: a revoked token being replayed → nuke the family.
    if row and row.revoked:
        db.query(RefreshToken).filter(
            RefreshToken.user_id == row.user_id
        ).update({"revoked": True})
        db.commit()
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Refresh token reuse detected")

    if (
        not row
        or str(row.user_id) != str(user_id)
        or row.expires_at < datetime.now(timezone.utc)
    ):
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Refresh token invalid or expired")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="User not found")

    # Rotate: revoke old, issue new.
    row.revoked = True
    db.commit()
    _issue_session(response, db, user)
    return {"status": "refreshed"}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(REFRESH_COOKIE)
    if token:
        try:
            payload = decode_token(token)
            jti = payload.get("jti")
            if jti:
                db.query(RefreshToken).filter(
                    RefreshToken.id == jti
                ).update({"revoked": True})
                db.commit()
        except jwt.PyJWTError:
            pass
    clear_auth_cookies(response)
    return {"status": "logged_out"}


@router.post("/logout-all")
def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke every refresh token for the user — signs out all devices."""
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id
    ).update({"revoked": True})
    db.commit()
    clear_auth_cookies(response)
    return {"status": "logged_out_all"}


@router.post("/change-password")
def change_password(
    body: ChangePassword,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change password after verifying the current one, then revoke all existing
    refresh tokens (sign out other sessions) and issue a fresh session here.
    """
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=400, detail="New password must be at least 8 characters"
        )

    current_user.hashed_password = hash_password(body.new_password)
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id
    ).update({"revoked": True})
    db.commit()

    _issue_session(response, db, current_user)  # keep this client logged in
    return {"status": "password_changed"}
