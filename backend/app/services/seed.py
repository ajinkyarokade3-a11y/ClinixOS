"""Seed demo users, doctors, patients and appointments. Idempotent.

Doctors/patients are upserted by name. Appointments are generated only when
no active appointments exist, using the real booking service so seeded
records can never overlap and always respect availability windows.
"""
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.entities import Appointment, Doctor, Patient
from app.services import appointments as svc
from app.services.auth import create_user

# name, specialty, department, work_start, work_end, slot, days, experience, room
DOCTORS = [
    ("Dr. Meera Iyer", "Cardiology", "Cardiology", "09:00", "17:00", 30, "1,2,3,4,5", 18, "C-204"),
    ("Dr. Arjun Patel", "Orthopedics", "Orthopedics", "10:00", "18:00", 30, "1,2,3,4,5", 14, "O-112"),
    ("Dr. Priya Nair", "Neurology", "Neurology", "09:00", "15:00", 20, "1,2,3,4,5", 12, "N-308"),
    ("Dr. Suresh Menon", "Pulmonology", "Pulmonology", "09:00", "17:00", 30, "1,2,3,4,6", 16, "P-101"),
    ("Dr. Ananya Rao", "Cardiology", "Cardiology", "10:00", "16:00", 30, "1,2,3,4,5", 9, "C-207"),
    ("Dr. Vikram Malhotra", "Cardiology", "Cardiology", "09:00", "13:00", 20, "1,3,5,6", 22, "C-201"),
    ("Dr. Kavya Reddy", "Cardiology", "Cardiology", "14:00", "20:00", 30, "1,2,3,4,5", 7, "C-210"),
    ("Dr. Rohan Desai", "Neurology", "Neurology", "10:00", "18:00", 30, "2,3,4,5,6", 11, "N-311"),
    ("Dr. Sneha Kulkarni", "Neurology", "Neurology", "09:00", "14:00", 20, "1,2,4,5", 8, "N-305"),
    ("Dr. Aditya Sharma", "Orthopedics", "Orthopedics", "09:00", "17:00", 30, "1,2,3,4,5", 15, "O-108"),
    ("Dr. Pooja Bhatt", "Orthopedics", "Orthopedics", "11:00", "19:00", 30, "1,2,3,5,6,7", 6, "O-115"),
    ("Dr. Karan Singh", "Orthopedics", "Orthopedics", "09:00", "13:00", 20, "2,4,6", 20, "O-101"),
    ("Dr. Divya Menon", "General Medicine", "General Medicine", "09:00", "17:00", 20, "1,2,3,4,5", 10, "G-102"),
    ("Dr. Rajesh Khanna", "General Medicine", "General Medicine", "10:00", "18:00", 20, "1,2,3,4,5", 25, "G-105"),
    ("Dr. Nisha Verma", "General Medicine", "General Medicine", "14:00", "21:00", 20, "1,2,3,4,5,6,7", 5, "G-108"),
    ("Dr. Manoj Tiwari", "General Medicine", "General Medicine", "09:00", "15:00", 20, "1,3,5", 13, "G-110"),
    ("Dr. Shalini Gupta", "Pulmonology", "Pulmonology", "10:00", "16:00", 30, "2,3,4,5", 9, "P-104"),
    ("Dr. Farhan Khan", "Pulmonology", "Pulmonology", "09:00", "17:00", 30, "1,2,3,4,5", 12, "P-107"),
    ("Dr. Lakshmi Venkat", "Pediatrics", "Pediatrics", "09:00", "15:00", 20, "1,2,3,4,5", 11, "PD-201"),
    ("Dr. Sanjay Pawar", "Pediatrics", "Pediatrics", "10:00", "18:00", 20, "1,2,3,4,6", 17, "PD-204"),
    ("Dr. Ritu Jain", "Pediatrics", "Pediatrics", "09:00", "13:00", 15, "1,2,3,4,5", 4, "PD-206"),
    ("Dr. Ashok Kumar", "Anesthesiology", "Anesthesiology", "08:00", "16:00", 30, "1,2,3,4,5", 19, "A-301"),
    ("Dr. Geeta Nair", "Anesthesiology", "Anesthesiology", "08:00", "16:00", 30, "1,2,3,4,5", 14, "A-303"),
    ("Dr. Imran Sheikh", "Anesthesiology", "Anesthesiology", "12:00", "20:00", 30, "2,3,4,5,6,7", 10, "A-305"),
]

PATIENTS = [
    ("Rajesh Kumar", 54, "Male", "+91-98000-00001"),
    ("Sunita Sharma", 41, "Female", "+91-98000-00002"),
    ("Amit Verma", 36, "Male", "+91-98000-00003"),
    ("Kavita Singh", 29, "Female", "+91-98000-00004"),
    ("Vikram Joshi", 63, "Male", "+91-98000-00005"),
    ("Anita Desai", 47, "Female", "+91-98000-00006"),
    ("Rahul Patil", 33, "Male", "+91-98000-00007"),
    ("Deepa Rao", 58, "Female", "+91-98000-00008"),
    ("Sanjay Kapoor", 45, "Male", "+91-98000-00009"),
    ("Meena Iyer", 52, "Female", "+91-98000-00010"),
    ("Arun Nair", 39, "Male", "+91-98000-00011"),
    ("Pallavi Joshi", 27, "Female", "+91-98000-00012"),
    ("Nikhil Bansal", 49, "Male", "+91-98000-00013"),
    ("Shreya Pillai", 31, "Female", "+91-98000-00014"),
    ("Gopalakrishnan R", 66, "Male", "+91-98000-00015"),
    ("Fatima Sheikh", 35, "Female", "+91-98000-00016"),
    ("Harpreet Gill", 43, "Male", "+91-98000-00017"),
    ("Anjali Bose", 24, "Female", "+91-98000-00018"),
    ("Mohammed Rizvi", 57, "Male", "+91-98000-00019"),
    ("Kiran Bedi", 48, "Female", "+91-98000-00020"),
    ("Suresh Raina", 38, "Male", "+91-98000-00021"),
    ("Lata Mangesh", 61, "Female", "+91-98000-00022"),
    ("Dev Patel", 9, "Male", "+91-98000-00023"),
    ("Aisha Khan", 12, "Female", "+91-98000-00024"),
]

APPT_TYPES = [
    ("Consultation", "Routine", "General checkup"),
    ("Follow-up", "Routine", "Follow-up visit"),
    ("Consultation", "Urgent", "Fever and cough"),
    ("Procedure", "Urgent", "Joint injection"),
    ("Review", "Routine", "Diabetes review"),
    ("Consultation", "Routine", "Skin rash"),
    ("Emergency", "Emergency", "Chest discomfort"),
    ("Review", "Routine", "Migraine follow-up"),
]


def seed_all(db: Session) -> dict:
    counts = {"users": 0, "doctors": 0, "patients": 0, "appointments": 0}
    for username, password, role, display in [
        ("admin", "admin123", "admin", "Administrator"),
        ("doctor", "doctor123", "doctor", "Dr. Meera Iyer"),
        ("reception", "reception123", "nurse", "Front Desk"),
        ("viewer", "viewer123", "viewer", "Read Only"),
    ]:
        try:
            create_user(db, username, password, role, display)
            counts["users"] += 1
        except ValueError:
            pass

    existing_docs = {d.name for d in db.query(Doctor).all()}
    for name, spec, dept, ws, we, slot, days, exp, room in DOCTORS:
        if name not in existing_docs:
            db.add(Doctor(name=name, specialty=spec, department=dept,
                          work_start=ws, work_end=we, slot_minutes=slot,
                          work_days=days, experience_years=exp, room_number=room))
            counts["doctors"] += 1
    db.commit()

    existing_pats = {p.name for p in db.query(Patient).all()}
    for name, age, gender, phone in PATIENTS:
        if name not in existing_pats:
            db.add(Patient(name=name, age=age, gender=gender, phone=phone, notes=""))
            counts["patients"] += 1
    db.commit()

    active = db.query(Appointment).filter(Appointment.status.in_(svc.ACTIVE_STATUSES)).count()
    if active == 0:
        counts["appointments"] = _seed_appointments(db)
    return counts


def _seed_appointments(db: Session) -> int:
    rng = random.Random(7)
    doctors = db.query(Doctor).order_by(Doctor.id).all()
    patients = db.query(Patient).order_by(Patient.id).all()
    if not doctors or not patients:
        return 0
    created = 0
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    for day_offset in range(-6, 8):
        day = today + timedelta(days=day_offset)
        rotation = [(day_offset * 5 + i) % len(doctors) for i in range(5)]
        for di in rotation:
            doctor = doctors[di]
            try:
                slots = svc.suggest_slots(db, doctor.id, day, doctor.slot_minutes)
            except LookupError:
                continue
            if not slots:
                continue
            n = 1 + (1 if rng.random() < 0.4 else 0)
            picks = rng.sample(slots, min(n, len(slots)))
            for slot in picks:
                patient = patients[rng.randrange(len(patients))]
                atype, prio, reason = APPT_TYPES[rng.randrange(len(APPT_TYPES))]
                try:
                    appt = svc.book_appointment(
                        db, patient.id, doctor.id,
                        datetime.fromisoformat(slot["start"]),
                        doctor.slot_minutes, reason, atype, prio)
                except (ValueError, LookupError):
                    continue
                if day_offset < 0:
                    appt.status = "cancelled" if rng.random() < 0.1 else "completed"
                    db.commit()
                elif day_offset == 0:
                    appt.status = rng.choice(["scheduled", "confirmed", "confirmed"])
                    db.commit()
                else:
                    if rng.random() < 0.08:
                        appt.status = "cancelled"
                        db.commit()
                    elif rng.random() < 0.3:
                        appt.status = "confirmed"
                        db.commit()
                created += 1
    return created
