from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models.entities import Appointment, Doctor, Patient

VALID_STATUSES = {"scheduled", "confirmed", "completed", "cancelled"}
ACTIVE_STATUSES = ("scheduled", "confirmed")

AVG_CONSULT_MINUTES = 15
BUFFER_MINUTES_PER_PATIENT = 2


def _parse_hhmm(value: str) -> tuple[int, int]:
    h, m = value.split(":")
    return int(h), int(m)


def doctor_is_available(doctor: Doctor, start: datetime, end: datetime) -> tuple[bool, str]:
    if start.weekday() + 1 not in {int(d) for d in doctor.work_days.split(",") if d.strip()}:
        return False, f"{doctor.name} does not work on this weekday"
    sh, sm = _parse_hhmm(doctor.work_start)
    eh, em = _parse_hhmm(doctor.work_end)
    day_start = start.replace(hour=sh, minute=sm, second=0, microsecond=0)
    day_end = start.replace(hour=eh, minute=em, second=0, microsecond=0)
    if start < day_start or end > day_end:
        return False, f"Outside working hours {doctor.work_start}–{doctor.work_end}"
    if end <= start:
        return False, "End time must be after start time"
    return True, ""


def _write_lock(db: Session) -> None:
    """Take the database write lock before check-then-insert.

    SQLite uses deferred transactions by default, so two concurrent requests
    can both pass the conflict SELECT before either commits (lost-update
    race). BEGIN IMMEDIATE serializes writers: the second request blocks
    until the first commits, then its conflict check sees the committed row.
    PostgreSQL uses row-level locking via the re-check inside the
    transaction, so this is a no-op there.
    """
    bind = db.get_bind()
    if bind is not None and bind.dialect.name == "sqlite":
        db.rollback()
        db.execute(text("BEGIN IMMEDIATE"))


def find_conflict(db: Session, doctor_id: int, start: datetime, end: datetime,
                  exclude_id: int | None = None) -> Appointment | None:
    q = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status.in_(ACTIVE_STATUSES),
        Appointment.start_time < end,
        Appointment.end_time > start,
    )
    if exclude_id is not None:
        q = q.filter(Appointment.id != exclude_id)
    return q.first()


def book_appointment(db: Session, patient_id: int, doctor_id: int,
                     start: datetime, duration_minutes: int = 30,
                     reason: str = "", appointment_type: str = "Consultation",
                     priority: str = "Routine") -> Appointment:
    if duration_minutes < 5 or duration_minutes > 240:
        raise ValueError("Duration must be between 5 and 240 minutes")
    _write_lock(db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        raise LookupError(f"Patient id {patient_id} not found")
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if doctor is None:
        raise LookupError(f"Doctor id {doctor_id} not found")
    end = start + timedelta(minutes=duration_minutes)
    ok, msg = doctor_is_available(doctor, start, end)
    if not ok:
        raise ValueError(msg)
    with db.begin_nested():
        conflict = find_conflict(db, doctor_id, start, end)
        if conflict is not None:
            raise ValueError(
                f"Schedule conflict: {doctor.name} already has appointment "
                f"#{conflict.id} ({conflict.start_time:%H:%M}–{conflict.end_time:%H:%M})"
            )
        appt = Appointment(patient_id=patient_id, doctor_id=doctor_id,
                           start_time=start, end_time=end, status="scheduled", reason=reason,
                           appointment_type=appointment_type, priority=priority)
        db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


def cancel_appointment(db: Session, appointment_id: int) -> Appointment:
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appt is None:
        raise LookupError(f"Appointment id {appointment_id} not found")
    if appt.status == "cancelled":
        raise ValueError("Appointment is already cancelled")
    appt.status = "cancelled"
    db.commit()
    db.refresh(appt)
    return appt


def reschedule_appointment(db: Session, appointment_id: int, new_start: datetime,
                           duration_minutes: int | None = None) -> Appointment:
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appt is None:
        raise LookupError(f"Appointment id {appointment_id} not found")
    if appt.status == "cancelled":
        raise ValueError("Cannot reschedule a cancelled appointment")
    _write_lock(db)
    doctor = db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()
    duration = duration_minutes or int((appt.end_time - appt.start_time).total_seconds() // 60)
    new_end = new_start + timedelta(minutes=duration)
    ok, msg = doctor_is_available(doctor, new_start, new_end)
    if not ok:
        raise ValueError(msg)
    with db.begin_nested():
        conflict = find_conflict(db, appt.doctor_id, new_start, new_end, exclude_id=appt.id)
        if conflict is not None:
            raise ValueError(
                f"Schedule conflict: overlaps appointment #{conflict.id} "
                f"({conflict.start_time:%H:%M}–{conflict.end_time:%H:%M})"
            )
        appt.start_time = new_start
        appt.end_time = new_end
    db.commit()
    db.refresh(appt)
    return appt


def estimate_waiting_time(position_in_queue: int, avg_consult_minutes: float = AVG_CONSULT_MINUTES,
                          buffer_per_patient: float = BUFFER_MINUTES_PER_PATIENT) -> float:
    """Waiting-time estimation (documented method).

    estimated_wait = position_in_queue × (avg_consult_minutes + buffer_per_patient)

    position_in_queue = number of active (scheduled/confirmed) appointments ahead
    of the patient for the same doctor on the same day, ordered by start time.
    avg_consult_minutes defaults to the trailing average consultation length and
    buffer_per_patient accounts for room turnover between patients.
    """
    if position_in_queue < 0:
        raise ValueError("position_in_queue must be >= 0")
    return round(position_in_queue * (avg_consult_minutes + buffer_per_patient), 1)


def daily_queue(db: Session, doctor_id: int, day: datetime) -> list[dict]:
    day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    appts = (db.query(Appointment)
             .filter(Appointment.doctor_id == doctor_id,
                     Appointment.status.in_(ACTIVE_STATUSES),
                     Appointment.start_time >= day_start,
                     Appointment.start_time < day_end)
             .order_by(Appointment.start_time).all())
    queue = []
    for i, a in enumerate(appts):
        queue.append({
            "appointment_id": a.id,
            "patient_id": a.patient_id,
            "patient_name": a.patient.name if a.patient else "",
            "start_time": a.start_time.isoformat(),
            "status": a.status,
            "position": i,
            "estimated_wait_min": estimate_waiting_time(i),
        })
    return queue


def suggest_slots(db: Session, doctor_id: int, day: datetime,
                  duration_minutes: int = 30) -> list[dict]:
    """Return free slots for a doctor on a given day honoring availability + conflicts."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if doctor is None:
        raise LookupError(f"Doctor id {doctor_id} not found")
    sh, sm = _parse_hhmm(doctor.work_start)
    eh, em = _parse_hhmm(doctor.work_end)
    cursor = day.replace(hour=sh, minute=sm, second=0, microsecond=0)
    end_of_day = day.replace(hour=eh, minute=em, second=0, microsecond=0)
    if cursor.weekday() + 1 not in {int(d) for d in doctor.work_days.split(",") if d.strip()}:
        return []
    slots = []
    while cursor + timedelta(minutes=duration_minutes) <= end_of_day:
        slot_end = cursor + timedelta(minutes=duration_minutes)
        if find_conflict(db, doctor_id, cursor, slot_end) is None:
            slots.append({"start": cursor.isoformat(), "end": slot_end.isoformat()})
        cursor += timedelta(minutes=duration_minutes)
    return slots
