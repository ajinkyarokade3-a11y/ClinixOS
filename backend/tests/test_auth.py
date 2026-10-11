import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.db import Base
from app.models.entities import User
from app.services.auth import (
    create_user, verify_password, create_token, decode_token,
)


def make_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_register_and_login():
    db = make_db()
    user = create_user(db, "alice", "password123", "nurse", "Alice")
    assert user.role == "nurse"
    assert verify_password(user, "password123")
    assert not verify_password(user, "wrong")


def test_duplicate_username():
    db = make_db()
    create_user(db, "bob", "password123", "viewer")
    with pytest.raises(ValueError, match="already exists"):
        create_user(db, "bob", "password123", "viewer")


def test_invalid_role():
    db = make_db()
    with pytest.raises(ValueError, match="Invalid role"):
        create_user(db, "eve", "password123", "superuser")


def test_token_roundtrip():
    db = make_db()
    user = create_user(db, "carol", "password123", "doctor")
    token = create_token(user)
    payload = decode_token(token)
    assert payload["sub"] == "carol"
    assert payload["role"] == "doctor"


def test_tampered_token_rejected():
    db = make_db()
    user = create_user(db, "dave", "password123", "viewer")
    token = create_token(user)
    with pytest.raises(Exception):
        decode_token(token + "tamper")
