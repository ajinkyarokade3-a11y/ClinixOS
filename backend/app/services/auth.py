import base64
import hashlib
import hmac
import json
import os
import time
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.entities import User

SECRET_KEY = os.environ.get("CLINIXOS_SECRET", "clinixos-dev-secret-change-me")
TOKEN_TTL_SECONDS = 8 * 3600
bearer_scheme = HTTPBearer(auto_error=False)

VALID_ROLES = {"admin", "doctor", "nurse", "technician", "viewer"}


def hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()


def new_salt() -> str:
    return base64.urlsafe_b64encode(os.urandom(16)).decode()


def create_user(db: Session, username: str, password: str, role: str = "viewer",
                display_name: str = "") -> User:
    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role '{role}'. Valid roles: {sorted(VALID_ROLES)}")
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise ValueError(f"Username '{username}' already exists")
    salt = new_salt()
    user = User(username=username, password_hash=hash_password(password, salt),
                salt=salt, role=role, display_name=display_name or username)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def verify_password(user: User, password: str) -> bool:
    return hmac.compare_digest(user.password_hash, hash_password(password, user.salt))


def create_token(user: User) -> str:
    payload = {"sub": user.username, "role": user.role, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    sig = hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def decode_token(token: str) -> dict:
    try:
        body, sig = token.rsplit(".", 1)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token format")
    expected = hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")
    try:
        payload = json.loads(base64.urlsafe_b64decode(body.encode()).decode())
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    if payload.get("exp", 0) < time.time():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    return payload


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
                     db: Session = Depends(get_db)) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    payload = decode_token(credentials.credentials)
    user = db.query(User).filter(User.username == payload.get("sub")).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail=f"Role '{user.role}' is not authorized for this action")
        return user
    return checker
