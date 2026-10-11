import { ApiError } from "./api";

const BASE_URL = "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("clinixos_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function fetchClinic<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...((options?.headers || {}) as Record<string, string>) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail || `Request failed (${res.status})`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("clinixos_token", token);
  else localStorage.removeItem("clinixos_token");
}

export function getToken(): string | null {
  return localStorage.getItem("clinixos_token");
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  department: string;
  work_start: string;
  work_end: string;
  slot_minutes: number;
  work_days: string;
  experience_years: number;
  room_number: string;
}

export interface DoctorStats {
  doctor_id: number;
  name: string;
  specialty: string;
  department: string;
  total: number;
  active: number;
  today: number;
}

export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  phone: string;
  notes: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  patient_name: string;
  doctor_name: string;
  specialty: string;
  start_time: string;
  end_time: string;
  status: string;
  reason: string;
  appointment_type: string;
  priority: string;
}

export interface QueueItem {
  appointment_id: number;
  patient_id: number;
  patient_name: string;
  start_time: string;
  status: string;
  position: number;
  estimated_wait_min: number;
}

export const authApi = {
  login: (username: string, password: string) =>
    fetchClinic<{ access_token: string; username: string; role: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => fetchClinic<{ username: string; role: string; display_name: string }>("/api/auth/me"),
  seed: () => fetchClinic<{ seeded: Record<string, number> }>("/api/auth/seed", { method: "POST" }),
  users: () => fetchClinic<{ username: string; role: string; display_name: string }[]>("/api/auth/users"),
};

export const appointmentsApi = {
  doctors: (specialty?: string) =>
    fetchClinic<Doctor[]>(`/api/appointments/doctors${specialty ? `?specialty=${encodeURIComponent(specialty)}` : ""}`),
  patients: (search?: string) =>
    fetchClinic<Patient[]>(`/api/appointments/patients${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createPatient: (data: Omit<Patient, "id">) =>
    fetchClinic<Patient>("/api/appointments/patients", { method: "POST", body: JSON.stringify(data) }),
  book: (patient_id: number, doctor_id: number, start_time: string, duration_minutes: number, reason: string, appointment_type = "Consultation", priority = "Routine") =>
    fetchClinic<Appointment>("/api/appointments/book", {
      method: "POST",
      body: JSON.stringify({ patient_id, doctor_id, start_time, duration_minutes, reason, appointment_type, priority }),
    }),
  doctorStats: () => fetchClinic<DoctorStats[]>("/api/appointments/doctor-stats"),
  cancel: (id: number) =>
    fetchClinic<Appointment>(`/api/appointments/${id}/cancel`, { method: "POST" }),
  reschedule: (id: number, new_start_time: string) =>
    fetchClinic<Appointment>(`/api/appointments/${id}/reschedule`, {
      method: "POST",
      body: JSON.stringify({ new_start_time }),
    }),
  daily: (doctor_id?: number, date?: string) => {
    const params = new URLSearchParams();
    if (doctor_id !== undefined) params.set("doctor_id", String(doctor_id));
    if (date) params.set("date", date);
    return fetchClinic<Appointment[]>(`/api/appointments/daily?${params.toString()}`);
  },
  history: (filters?: { patient_id?: number; doctor_id?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.patient_id !== undefined) params.set("patient_id", String(filters.patient_id));
    if (filters?.doctor_id !== undefined) params.set("doctor_id", String(filters.doctor_id));
    if (filters?.status) params.set("status", filters.status);
    return fetchClinic<Appointment[]>(`/api/appointments/history?${params.toString()}`);
  },
  queue: (doctor_id: number, date?: string) =>
    fetchClinic<QueueItem[]>(`/api/appointments/queue?doctor_id=${doctor_id}${date ? `&date=${encodeURIComponent(date)}` : ""}`),
  slots: (doctor_id: number, date: string, duration_minutes = 30) =>
    fetchClinic<{ start: string; end: string }[]>(
      `/api/appointments/slots?doctor_id=${doctor_id}&date=${encodeURIComponent(date)}&duration_minutes=${duration_minutes}`
    ),
  summary: (date?: string) =>
    fetchClinic<{ date: string; total: number; by_status: Record<string, number>; by_specialty: Record<string, number>; avg_wait_min: number }>(
      `/api/appointments/summary${date ? `?date=${encodeURIComponent(date)}` : ""}`
    ),
};

export interface MarketConfig {
  rounds: number;
  price_options: number[];
  base_demand: number;
  price_sensitivity: number;
  cross_sensitivity: number;
  capacity: number;
  unit_cost: number;
  fixed_cost_per_round: number;
  search_depth: number;
  use_alpha_beta: boolean;
}

export interface MarketSimulation {
  best_price: number;
  predicted_total_profit: number;
  simulated_total_profit: number;
  simulated_total_revenue: number;
  simulated_avg_share: number;
  alternatives: { price: number; predicted_total_profit: number; immediate_revenue: number; immediate_profit: number; immediate_share: number }[];
  rounds: { round: number; our_price: number; rival_price: number; demand: number; units: number; revenue: number; profit: number; share: number }[];
  tree: { id: number; parent_id: number | null; turn: string; move_label: string; value: number; pruned: boolean; children_ids: number[] }[];
  explored_states: number;
  pruned_states: number;
  depth: number;
  alpha_beta: boolean;
  assumptions: string[];
}

export const marketApi = {
  simulate: (cfg: MarketConfig) =>
    fetchClinic<MarketSimulation>("/api/market/simulate", { method: "POST", body: JSON.stringify(cfg) }),
};
