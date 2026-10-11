from datetime import datetime
from pydantic import BaseModel, Field


class DoctorOut(BaseModel):
    id: int
    name: str
    specialty: str
    department: str
    work_start: str
    work_end: str
    slot_minutes: int
    work_days: str
    experience_years: int = 0
    room_number: str = ""

    model_config = {"from_attributes": True}


class PatientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    age: int = Field(0, ge=0, le=150)
    gender: str = Field("", max_length=16)
    phone: str = Field("", max_length=32)
    notes: str = ""


class PatientOut(PatientCreate):
    id: int

    model_config = {"from_attributes": True}


class AppointmentBook(BaseModel):
    patient_id: int
    doctor_id: int
    start_time: datetime
    duration_minutes: int = Field(30, ge=5, le=240)
    reason: str = Field("", max_length=256)
    appointment_type: str = Field("Consultation", max_length=32)
    priority: str = Field("Routine", max_length=16)


class AppointmentReschedule(BaseModel):
    new_start_time: datetime
    duration_minutes: int | None = Field(None, ge=5, le=240)


class AppointmentOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    patient_name: str = ""
    doctor_name: str = ""
    specialty: str = ""
    start_time: datetime
    end_time: datetime
    status: str
    reason: str
    appointment_type: str = "Consultation"
    priority: str = "Routine"

    model_config = {"from_attributes": True}


class DoctorStats(BaseModel):
    doctor_id: int
    name: str
    specialty: str
    department: str
    total: int
    active: int
    today: int


class QueueItem(BaseModel):
    appointment_id: int
    patient_id: int
    patient_name: str
    start_time: str
    status: str
    position: int
    estimated_wait_min: float


class SlotOut(BaseModel):
    start: str
    end: str


class DashboardSummary(BaseModel):
    date: str
    total: int
    by_status: dict[str, int]
    by_specialty: dict[str, int]
    avg_wait_min: float
