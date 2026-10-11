from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.db import get_db, init_db
from app.models.entities import Appointment, Doctor, Patient, User
from app.schemas.appointments import (
    AppointmentBook, AppointmentOut, AppointmentReschedule, DashboardSummary,
    DoctorOut, DoctorStats, PatientCreate, PatientOut, QueueItem, SlotOut,
)
from app.services import appointments as svc
from app.services.auth import get_current_user, require_roles
from app.services.seed import seed_all

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


def _ensure_db(db: Session):
    init_db()
    if db.query(Doctor).count() == 0:
        seed_all(db)


def _to_out(a: Appointment) -> AppointmentOut:
    return AppointmentOut(
        id=a.id, patient_id=a.patient_id, doctor_id=a.doctor_id,
        patient_name=a.patient.name if a.patient else "",
        doctor_name=a.doctor.name if a.doctor else "",
        specialty=a.doctor.specialty if a.doctor else "",
        start_time=a.start_time, end_time=a.end_time,
        status=a.status, reason=a.reason or "",
        appointment_type=a.appointment_type or "Consultation",
        priority=a.priority or "Routine",
    )


@router.get("/doctors", response_model=list[DoctorOut])
def list_doctors(specialty: str | None = None, db: Session = Depends(get_db)):
    _ensure_db(db)
    q = db.query(Doctor)
    if specialty:
        q = q.filter(Doctor.specialty == specialty)
    return q.order_by(Doctor.name).all()


@router.get("/doctor-stats", response_model=list[DoctorStats])
def doctor_stats(user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    _ensure_db(db)
    from datetime import timedelta
    now = datetime.now()
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    out = []
    for d in db.query(Doctor).order_by(Doctor.name).all():
        total = db.query(Appointment).filter(Appointment.doctor_id == d.id).count()
        active = db.query(Appointment).filter(
            Appointment.doctor_id == d.id,
            Appointment.status.in_(svc.ACTIVE_STATUSES)).count()
        today = db.query(Appointment).filter(
            Appointment.doctor_id == d.id,
            Appointment.status.in_(svc.ACTIVE_STATUSES),
            Appointment.start_time >= day_start,
            Appointment.start_time < day_start + timedelta(days=1)).count()
        out.append(DoctorStats(doctor_id=d.id, name=d.name, specialty=d.specialty,
                               department=d.department, total=total, active=active, today=today))
    return out


@router.get("/patients", response_model=list[PatientOut])
def list_patients(search: str | None = None,
                  user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    _ensure_db(db)
    q = db.query(Patient)
    if search:
        q = q.filter(Patient.name.ilike(f"%{search}%"))
    return q.order_by(Patient.name).limit(100).all()


@router.post("/patients", response_model=PatientOut)
def create_patient(data: PatientCreate,
                   user: User = Depends(require_roles("admin", "doctor", "nurse")),
                   db: Session = Depends(get_db)):
    _ensure_db(db)
    patient = Patient(name=data.name, age=data.age, gender=data.gender,
                      phone=data.phone, notes=data.notes)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.post("/book", response_model=AppointmentOut)
def book(data: AppointmentBook,
         user: User = Depends(require_roles("admin", "doctor", "nurse")),
         db: Session = Depends(get_db)):
    _ensure_db(db)
    try:
        appt = svc.book_appointment(db, data.patient_id, data.doctor_id,
                                    data.start_time, data.duration_minutes, data.reason,
                                    data.appointment_type, data.priority)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return _to_out(appt)


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel(appointment_id: int,
           user: User = Depends(require_roles("admin", "doctor", "nurse")),
           db: Session = Depends(get_db)):
    _ensure_db(db)
    try:
        appt = svc.cancel_appointment(db, appointment_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _to_out(appt)


@router.post("/{appointment_id}/reschedule", response_model=AppointmentOut)
def reschedule(appointment_id: int, data: AppointmentReschedule,
               user: User = Depends(require_roles("admin", "doctor", "nurse")),
               db: Session = Depends(get_db)):
    _ensure_db(db)
    try:
        appt = svc.reschedule_appointment(db, appointment_id, data.new_start_time,
                                          data.duration_minutes)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return _to_out(appt)


@router.get("/daily", response_model=list[AppointmentOut])
def daily_schedule(doctor_id: int | None = None, date: str | None = None,
                   user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    _ensure_db(db)
    q = db.query(Appointment).filter(Appointment.status.in_(svc.ACTIVE_STATUSES))
    if doctor_id is not None:
        q = q.filter(Appointment.doctor_id == doctor_id)
    if date:
        try:
            day = datetime.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format, use ISO format")
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        from datetime import timedelta
        q = q.filter(Appointment.start_time >= day_start,
                     Appointment.start_time < day_start + timedelta(days=1))
    return [_to_out(a) for a in q.order_by(Appointment.start_time).limit(200).all()]


@router.get("/history", response_model=list[AppointmentOut])
def history(patient_id: int | None = None, doctor_id: int | None = None,
            status: str | None = None,
            user: User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    _ensure_db(db)
    q = db.query(Appointment)
    if patient_id is not None:
        q = q.filter(Appointment.patient_id == patient_id)
    if doctor_id is not None:
        q = q.filter(Appointment.doctor_id == doctor_id)
    if status:
        if status not in svc.VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status '{status}'")
        q = q.filter(Appointment.status == status)
    return [_to_out(a) for a in q.order_by(Appointment.start_time.desc()).limit(200).all()]


@router.get("/queue", response_model=list[QueueItem])
def queue(doctor_id: int, date: str | None = None,
          user: User = Depends(get_current_user),
          db: Session = Depends(get_db)):
    _ensure_db(db)
    day = datetime.fromisoformat(date) if date else datetime.now()
    return svc.daily_queue(db, doctor_id, day)


@router.get("/slots", response_model=list[SlotOut])
def slots(doctor_id: int, date: str,
          duration_minutes: int = Query(30, ge=5, le=240),
          user: User = Depends(get_current_user),
          db: Session = Depends(get_db)):
    _ensure_db(db)
    try:
        day = datetime.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use ISO format")
    try:
        return svc.suggest_slots(db, doctor_id, day, duration_minutes)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/summary", response_model=DashboardSummary)
def summary(date: str | None = None,
            user: User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    _ensure_db(db)
    from datetime import timedelta
    day = datetime.fromisoformat(date) if date else datetime.now()
    day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
    appts = (db.query(Appointment)
             .filter(Appointment.start_time >= day_start,
                     Appointment.start_time < day_start + timedelta(days=1)).all())
    by_status: dict[str, int] = {}
    by_specialty: dict[str, int] = {}
    waits = []
    for i, a in enumerate(sorted(appts, key=lambda x: x.start_time)):
        by_status[a.status] = by_status.get(a.status, 0) + 1
        spec = a.doctor.specialty if a.doctor else "Unknown"
        by_specialty[spec] = by_specialty.get(spec, 0) + 1
        if a.status in svc.ACTIVE_STATUSES:
            waits.append(svc.estimate_waiting_time(i))
    avg_wait = round(sum(waits) / len(waits), 1) if waits else 0.0
    return DashboardSummary(date=day_start.date().isoformat(), total=len(appts),
                            by_status=by_status, by_specialty=by_specialty,
                            avg_wait_min=avg_wait)
