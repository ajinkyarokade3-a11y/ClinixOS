from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.db import Base
from app.models.entities import Appointment, Doctor, Patient
from app.services import appointments as svc
from app.services.seed import seed_all


def make_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_seed_counts():
    db = make_db()
    counts = seed_all(db)
    assert db.query(Doctor).count() == 24
    assert db.query(Patient).count() == 24
    assert 50 <= counts["appointments"] <= 100


def test_seed_idempotent():
    db = make_db()
    first = seed_all(db)
    second = seed_all(db)
    assert db.query(Doctor).count() == 24
    assert db.query(Patient).count() == 24
    assert second["appointments"] == 0
    assert second["doctors"] == 0
    assert second["patients"] == 0
    assert first["appointments"] > 0


def test_seeded_no_overlaps():
    db = make_db()
    seed_all(db)
    rows = db.query(Appointment).filter(
        Appointment.status.in_(svc.ACTIVE_STATUSES)).all()
    assert len(rows) > 0
    for i in range(len(rows)):
        for j in range(i + 1, len(rows)):
            a, b = rows[i], rows[j]
            if a.doctor_id == b.doctor_id:
                assert not (a.start_time < b.end_time and a.end_time > b.start_time)


def test_seeded_status_mix():
    db = make_db()
    seed_all(db)
    statuses = {a.status for a in db.query(Appointment).all()}
    assert "completed" in statuses
    assert "scheduled" in statuses
    assert "confirmed" in statuses
    assert "cancelled" in statuses


def test_doctors_have_rooms_and_experience():
    db = make_db()
    seed_all(db)
    for d in db.query(Doctor).all():
        assert d.experience_years >= 0
        assert d.room_number != ""


def test_doctor_stats_endpoint_shape():
    from fastapi.testclient import TestClient
    from app.main import app
    c = TestClient(app)
    c.post("/api/auth/seed")
    r = c.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    stats = c.get("/api/appointments/doctor-stats", headers=h)
    assert stats.status_code == 200
    rows = stats.json()
    assert len(rows) >= 24
    first = rows[0]
    for key in ("doctor_id", "name", "specialty", "total", "active", "today"):
        assert key in first
    assert sum(s["today"] for s in rows) >= 0
