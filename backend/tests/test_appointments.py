from datetime import datetime, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.db import Base
from app.models.entities import Doctor, Patient
from app.services import appointments as svc


def make_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    db.add(Doctor(name="Dr. Test", specialty="Cardiology", department="Cardiology",
                  work_start="09:00", work_end="17:00", slot_minutes=30, work_days="1,2,3,4,5"))
    db.add(Patient(name="Test Patient", age=40, gender="Male", phone="000"))
    db.add(Patient(name="Second Patient", age=30, gender="Female", phone="001"))
    db.commit()
    return db


def monday_10am() -> datetime:
    d = datetime(2026, 10, 12, 10, 0)  # a Monday
    assert d.weekday() == 0
    return d


def test_book_success():
    db = make_db()
    appt = svc.book_appointment(db, 1, 1, monday_10am(), 30, "checkup")
    assert appt.id is not None
    assert appt.status == "scheduled"
    assert (appt.end_time - appt.start_time) == timedelta(minutes=30)


def test_double_booking_prevented():
    db = make_db()
    svc.book_appointment(db, 1, 1, monday_10am(), 30)
    with pytest.raises(ValueError, match="conflict"):
        svc.book_appointment(db, 2, 1, monday_10am() + timedelta(minutes=15), 30)


def test_adjacent_slots_allowed():
    db = make_db()
    svc.book_appointment(db, 1, 1, monday_10am(), 30)
    appt2 = svc.book_appointment(db, 2, 1, monday_10am() + timedelta(minutes=30), 30)
    assert appt2.id is not None


def test_outside_hours_rejected():
    db = make_db()
    with pytest.raises(ValueError, match="[Ww]orking hours|does not work"):
        svc.book_appointment(db, 1, 1, monday_10am().replace(hour=7), 30)


def test_weekend_rejected():
    db = make_db()
    saturday = datetime(2026, 10, 17, 10, 0)
    assert saturday.weekday() == 5
    with pytest.raises(ValueError, match="does not work"):
        svc.book_appointment(db, 1, 1, saturday, 30)


def test_cancel():
    db = make_db()
    appt = svc.book_appointment(db, 1, 1, monday_10am(), 30)
    cancelled = svc.cancel_appointment(db, appt.id)
    assert cancelled.status == "cancelled"


def test_cancelled_slot_reusable():
    db = make_db()
    appt = svc.book_appointment(db, 1, 1, monday_10am(), 30)
    svc.cancel_appointment(db, appt.id)
    appt2 = svc.book_appointment(db, 2, 1, monday_10am(), 30)
    assert appt2.id is not None


def test_reschedule_conflict():
    db = make_db()
    a1 = svc.book_appointment(db, 1, 1, monday_10am(), 30)
    svc.book_appointment(db, 2, 1, monday_10am() + timedelta(hours=1), 30)
    with pytest.raises(ValueError, match="conflict"):
        svc.reschedule_appointment(db, a1.id, monday_10am() + timedelta(hours=1, minutes=15))


def test_reschedule_success():
    db = make_db()
    a1 = svc.book_appointment(db, 1, 1, monday_10am(), 30)
    moved = svc.reschedule_appointment(db, a1.id, monday_10am() + timedelta(hours=2))
    assert moved.start_time == monday_10am() + timedelta(hours=2)


def test_queue_ordering_and_wait():
    db = make_db()
    svc.book_appointment(db, 2, 1, monday_10am() + timedelta(minutes=30), 30)
    svc.book_appointment(db, 1, 1, monday_10am(), 30)
    queue = svc.daily_queue(db, 1, monday_10am())
    assert len(queue) == 2
    assert queue[0]["position"] == 0
    assert queue[0]["estimated_wait_min"] == 0
    assert queue[1]["position"] == 1
    assert queue[1]["estimated_wait_min"] > 0


def test_waiting_time_method():
    assert svc.estimate_waiting_time(0) == 0
    assert svc.estimate_waiting_time(2) == 2 * (svc.AVG_CONSULT_MINUTES + svc.BUFFER_MINUTES_PER_PATIENT)
    with pytest.raises(ValueError):
        svc.estimate_waiting_time(-1)


def test_suggest_slots_excludes_booked():
    db = make_db()
    before = svc.suggest_slots(db, 1, monday_10am(), 30)
    svc.book_appointment(db, 1, 1, monday_10am(), 30)
    after = svc.suggest_slots(db, 1, monday_10am(), 30)
    assert len(after) == len(before) - 1


def test_missing_patient_or_doctor():
    db = make_db()
    with pytest.raises(LookupError):
        svc.book_appointment(db, 999, 1, monday_10am(), 30)
    with pytest.raises(LookupError):
        svc.book_appointment(db, 1, 999, monday_10am(), 30)
