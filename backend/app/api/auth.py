from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database.db import get_db, init_db
from app.models.entities import User
from app.services.auth import create_user, verify_password, create_token, get_current_user, require_roles
from app.services.seed import seed_all

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6, max_length=128)
    role: str = "viewer"
    display_name: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


class UserOut(BaseModel):
    username: str
    role: str
    display_name: str


@router.post("/register", response_model=UserOut)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if data.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot self-register as admin")
    try:
        user = create_user(db, data.username, data.password, data.role, data.display_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return UserOut(username=user.username, role=user.role, display_name=user.display_name)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if user is None or not verify_password(user, data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return TokenResponse(access_token=create_token(user), username=user.username, role=user.role)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(username=user.username, role=user.role, display_name=user.display_name)


@router.post("/seed")
def seed(db: Session = Depends(get_db)):
    init_db()
    counts = seed_all(db)
    return {"seeded": counts}


@router.get("/users", response_model=list[UserOut])
def list_users(user: User = Depends(require_roles("admin")),
               db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.username).all()
    return [UserOut(username=u.username, role=u.role, display_name=u.display_name) for u in users]
