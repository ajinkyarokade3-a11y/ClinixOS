import type { Appointment, Doctor, Patient, QueueItem } from "../services/clinicApi";

export const DEMO_DOCTORS: Doctor[] = [
  { id: 1, name: "Dr. Meera Iyer", specialty: "Cardiology", department: "Cardiology", work_start: "09:00", work_end: "17:00", slot_minutes: 30, work_days: "1,2,3,4,5", experience_years: 18, room_number: "C-204" },
  { id: 2, name: "Dr. Arjun Patel", specialty: "Orthopedics", department: "Orthopedics", work_start: "10:00", work_end: "18:00", slot_minutes: 30, work_days: "1,2,3,4,5", experience_years: 14, room_number: "O-112" },
  { id: 3, name: "Dr. Priya Nair", specialty: "Neurology", department: "Neurology", work_start: "09:00", work_end: "15:00", slot_minutes: 20, work_days: "1,2,3,4,5", experience_years: 12, room_number: "N-308" },
  { id: 4, name: "Dr. Suresh Menon", specialty: "Pulmonology", department: "Pulmonology", work_start: "09:00", work_end: "17:00", slot_minutes: 30, work_days: "1,2,3,4,6", experience_years: 16, room_number: "P-101" },
];

export const DEMO_PATIENTS: Patient[] = [
  { id: 1, name: "Rajesh Kumar", age: 54, gender: "Male", phone: "+91-98000-00001", notes: "" },
  { id: 2, name: "Sunita Sharma", age: 41, gender: "Female", phone: "+91-98000-00002", notes: "" },
  { id: 3, name: "Amit Verma", age: 36, gender: "Male", phone: "+91-98000-00003", notes: "" },
  { id: 4, name: "Kavita Singh", age: 29, gender: "Female", phone: "+91-98000-00004", notes: "" },
  { id: 5, name: "Vikram Joshi", age: 63, gender: "Male", phone: "+91-98000-00005", notes: "" },
  { id: 6, name: "Anita Desai", age: 47, gender: "Female", phone: "+91-98000-00006", notes: "" },
  { id: 7, name: "Rahul Patil", age: 33, gender: "Male", phone: "+91-98000-00007", notes: "" },
  { id: 8, name: "Deepa Rao", age: 58, gender: "Female", phone: "+91-98000-00008", notes: "" },
];

const DEMO_SLOTS: { time: string; patient: number; status: string; reason: string; type: string; priority: string }[] = [
  { time: "09:30:00", patient: 1, status: "confirmed", reason: "General checkup", type: "Consultation", priority: "Routine" },
  { time: "10:00:00", patient: 2, status: "scheduled", reason: "Follow-up visit", type: "Follow-up", priority: "Routine" },
  { time: "10:30:00", patient: 3, status: "confirmed", reason: "Chest pain evaluation", type: "Emergency", priority: "Emergency" },
  { time: "11:30:00", patient: 4, status: "scheduled", reason: "Knee pain", type: "Consultation", priority: "Routine" },
  { time: "12:00:00", patient: 5, status: "scheduled", reason: "Diabetes review", type: "Review", priority: "Routine" },
  { time: "14:00:00", patient: 6, status: "confirmed", reason: "Migraine follow-up", type: "Follow-up", priority: "Urgent" },
];

function endTime(start: string): string {
  const [h, m] = start.split(":").map(Number);
  const d = new Date(2026, 0, 1, h, m + 30);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
}

export function demoDailyAppointments(dayISO: string, doctorId: number): Appointment[] {
  const date = dayISO.slice(0, 10);
  const doctor = DEMO_DOCTORS.find((d) => d.id === doctorId) ?? DEMO_DOCTORS[0];
  return DEMO_SLOTS.map((s, i) => {
    const patient = DEMO_PATIENTS.find((p) => p.id === s.patient) ?? DEMO_PATIENTS[0];
    return {
      id: 1000 + doctor.id * 100 + i,
      patient_id: patient.id,
      doctor_id: doctor.id,
      patient_name: patient.name,
      doctor_name: doctor.name,
      specialty: doctor.specialty,
      start_time: `${date}T${s.time}`,
      end_time: `${date}T${endTime(s.time)}`,
      status: s.status,
      reason: s.reason,
      appointment_type: s.type,
      priority: s.priority,
    };
  });
}

export function demoQueueFor(dayISO: string, doctorId: number): QueueItem[] {
  return demoDailyAppointments(dayISO, doctorId).map((a, i) => ({
    appointment_id: a.id,
    patient_id: a.patient_id,
    patient_name: a.patient_name,
    start_time: a.start_time,
    status: a.status,
    position: i,
    estimated_wait_min: i * 17,
  }));
}

export function demoAllAppointments(dayISO: string): Appointment[] {
  return DEMO_DOCTORS.flatMap((d) => demoDailyAppointments(dayISO, d.id));
}
