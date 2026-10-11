import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock, Info, LogIn, LogOut, Plus, RefreshCw, Search, Users } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Select } from "../components/ui/Select";
import { Input } from "../components/ui/Input";
import { Dialog } from "../components/ui/Dialog";
import { ApiError } from "../services/api";
import {
  appointmentsApi, authApi, getToken, setToken,
  type Appointment, type Doctor, type DoctorStats, type Patient, type QueueItem,
} from "../services/clinicApi";
import {
  DEMO_DOCTORS, DEMO_PATIENTS, demoAllAppointments,
  demoDailyAppointments, demoQueueFor,
} from "../data/appointmentDemo";

function datePart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00`;
}

const statusVariant: Record<string, "success" | "info" | "neutral" | "danger" | "warning"> = {
  scheduled: "info",
  confirmed: "success",
  completed: "neutral",
  cancelled: "danger",
};

export function Appointments() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "reception", password: "reception123" });
  const [authError, setAuthError] = useState<string | null>(null);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [daily, setDaily] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [summary, setSummary] = useState<{ total: number; by_status: Record<string, number>; by_specialty: Record<string, number>; avg_wait_min: number } | null>(null);

  const [doctorId, setDoctorId] = useState<number | undefined>(undefined);
  const [day, setDay] = useState(datePart());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [bookForm, setBookForm] = useState({ patient_id: 0, doctor_id: 0, date: datePart().slice(0, 10), slot: "", duration: 30, reason: "", apptType: "Consultation", priority: "Routine" });
  const [doctorStats, setDoctorStats] = useState<DoctorStats[]>([]);
  const [docDept, setDocDept] = useState("all");
  const [docSearch, setDocSearch] = useState("");
  const [histDept, setHistDept] = useState("all");
  const [histType, setHistType] = useState("all");
  const [reschedAppt, setReschedAppt] = useState<Appointment | null>(null);
  const [reschedDate, setReschedDate] = useState(datePart().slice(0, 10));
  const [reschedSlots, setReschedSlots] = useState<{ start: string; end: string }[]>([]);
  const [reschedSlot, setReschedSlot] = useState("");
  const [newPatient, setNewPatient] = useState({ name: "", age: 30, phone: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const applyDemoDay = (did: number, dayISO: string, status: string) => {
    setDaily(demoDailyAppointments(dayISO, did));
    setQueue(demoQueueFor(dayISO, did));
    const all = demoAllAppointments(dayISO).filter((a) => !status || a.status === status);
    setHistory(all);
    const byStatus: Record<string, number> = {};
    const bySpecialty: Record<string, number> = {};
    for (const a of demoDailyAppointments(dayISO, did)) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
      bySpecialty[a.specialty] = (bySpecialty[a.specialty] ?? 0) + 1;
    }
    setSummary({ total: demoDailyAppointments(dayISO, did).length, by_status: byStatus, by_specialty: bySpecialty, avg_wait_min: 34 });
  };

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const docs = await appointmentsApi.doctors();
      const [pats, sum] = await Promise.all([
        appointmentsApi.patients().catch(() => [] as Patient[]),
        appointmentsApi.summary().catch(() => null),
      ]);
      setDemoMode(false);
      setDoctors(docs);
      setPatients(pats);
      if (sum) setSummary({ total: sum.total, by_status: sum.by_status, by_specialty: sum.by_specialty, avg_wait_min: sum.avg_wait_min });
      if (docs.length > 0) {
        const did = doctorId ?? docs[0].id;
        setDoctorId(did);
        const [d, q] = await Promise.all([
          appointmentsApi.daily(did, day).catch(() => [] as Appointment[]),
          appointmentsApi.queue(did, day).catch(() => [] as QueueItem[]),
        ]);
        setDaily(d);
        setQueue(q);
      }
      const h = await appointmentsApi.history({ status: statusFilter || undefined }).catch(() => [] as Appointment[]);
      setHistory(h);
      const stats = await appointmentsApi.doctorStats().catch(() => [] as DoctorStats[]);
      setDoctorStats(stats);
    } catch (e) {
      if (e instanceof ApiError) {
        setDemoMode(true);
        setDoctors(DEMO_DOCTORS);
        setPatients(DEMO_PATIENTS);
        const did = doctorId ?? DEMO_DOCTORS[0].id;
        setDoctorId(did);
        applyDemoDay(did, day, statusFilter);
        setError(null);
      } else {
        setError("Failed to load. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  }, [day, doctorId, statusFilter]);

  useEffect(() => {
    if (getToken()) {
      authApi.me().then((u) => setUser({ username: u.username, role: u.role })).catch(() => setToken(null));
    }
    refresh();
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const doLogin = async () => {
    setAuthError(null);
    try {
      const r = await authApi.login(loginForm.username, loginForm.password);
      setToken(r.access_token);
      setUser({ username: r.username, role: r.role });
      setNotice(`Signed in as ${r.username} (${r.role}).`);
      refresh();
    } catch (e) {
      setAuthError(e instanceof ApiError ? e.message : "Login failed.");
    }
  };

  const doSeed = async () => {
    try {
      await authApi.seed();
      setNotice("Data initialized. Sign in with reception / reception123.");
    } catch (e) {
      setAuthError(e instanceof ApiError ? e.message : "Seed failed.");
    }
  };

  const loadSlots = async () => {
    if (!bookForm.doctor_id || !bookForm.date) return;
    try {
      const s = await appointmentsApi.slots(bookForm.doctor_id, `${bookForm.date}T00:00:00`, bookForm.duration);
      setSlots(s);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load slots.");
    }
  };

  const doBook = async () => {
    setError(null);
    setNotice(null);
    try {
      await appointmentsApi.book(bookForm.patient_id, bookForm.doctor_id, bookForm.slot, bookForm.duration, bookForm.reason, bookForm.apptType, bookForm.priority);
      setNotice("Appointment booked successfully.");
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Booking failed.");
    }
  };

  const openReschedule = async (a: Appointment) => {
    setReschedAppt(a);
    setReschedDate(a.start_time.slice(0, 10));
    setReschedSlot("");
    setError(null);
    try {
      const s = await appointmentsApi.slots(a.doctor_id, `${a.start_time.slice(0, 10)}T00:00:00`, Math.round((new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000));
      setReschedSlots(s);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load slots.");
    }
  };

  const loadReschedSlots = async (date: string) => {
    if (!reschedAppt) return;
    try {
      const s = await appointmentsApi.slots(reschedAppt.doctor_id, `${date}T00:00:00`, Math.round((new Date(reschedAppt.end_time).getTime() - new Date(reschedAppt.start_time).getTime()) / 60000));
      setReschedSlots(s);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load slots.");
    }
  };

  const doReschedule = async () => {
    if (!reschedAppt || !reschedSlot) return;
    try {
      await appointmentsApi.reschedule(reschedAppt.id, reschedSlot);
      setNotice(`Appointment #${reschedAppt.id} moved to ${reschedSlot.slice(0, 16).replace("T", " ")}.`);
      setReschedAppt(null);
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Reschedule failed.");
    }
  };

  const doCancel = async (id: number) => {
    try {
      await appointmentsApi.cancel(id);
      setNotice(`Appointment #${id} cancelled.`);
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Cancel failed.");
    }
  };

  const canWrite = !!user && ["admin", "doctor", "nurse"].includes(user.role) && !demoMode;

  const loadDemoDay = async () => {
    if (!doctorId || !canWrite) return;
    setError(null);
    setNotice(null);
    try {
      const free = await appointmentsApi.slots(doctorId, day, 30);
      const picks = [free[1], free[3], free[5], free[7], free[9], free[12]].filter(Boolean);
      if (picks.length === 0) {
        setNotice("No free slots left on this day — pick another date.");
        return;
      }
      const reasons = ["General checkup", "Follow-up visit", "Fever and cough", "Back pain", "Skin rash", "Diabetes review"];
      const ids = patients.length > 0 ? patients.map((p) => p.id) : [1];
      let booked = 0;
      for (let i = 0; i < picks.length; i++) {
        try {
          await appointmentsApi.book(ids[i % ids.length], doctorId, picks[i].start, 30, reasons[i % reasons.length]);
          booked++;
        } catch (e) {
          if (!(e instanceof ApiError) || e.status !== 409) throw e;
        }
      }
      setNotice(`${booked} appointments booked for ${day.slice(0, 10)}. Bustling day ahead.`);
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Booking failed.");
    }
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Hospital Appointments"
        subtitle="Booking with double-booking prevention, daily schedules, queue and waiting-time estimates."
        actions={
          <>
            {user ? (
              <span className="flex items-center gap-2 text-sm text-slate-600">
                <Badge variant={user.role === "viewer" ? "neutral" : "success"}>{user.role}</Badge>
                {user.username}
                <Button variant="ghost" onClick={() => { setToken(null); setUser(null); }} icon={<LogOut size={14} />}>Sign out</Button>
              </span>
            ) : (
              <Badge variant="warning">Not signed in — read-only</Badge>
            )}
            <Button variant="secondary" onClick={refresh} icon={<RefreshCw size={16} />}>Refresh</Button>
          </>
        }
      />

      {!user && (
        <Card>
          <CardHeader title="Sign In" subtitle="Booking and cancellations require a staff role (e.g. reception / reception123)" />
          <CardBody>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <Input label="Username" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} />
              <Input label="Password" type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
              <Button onClick={doLogin} icon={<LogIn size={16} />}>Sign In</Button>
              <Button variant="secondary" onClick={doSeed}>Initialize Data</Button>
            </div>
            {authError && <p className="mt-2 text-sm text-rose-600">{authError}. If this is a fresh database, click “Initialize Data” first.</p>}
          </CardBody>
        </Card>
      )}

      {(error || notice) && (
        <Card>
          <CardBody>
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}
            {notice && (
              <div className="mt-2 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <Info size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                <p className="text-sm text-emerald-700">{notice}</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-slate-500">Today's Appointments</p><p className="mt-1 text-2xl font-bold text-slate-800">{summary.total}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500">Avg Est. Wait</p><p className="mt-1 text-2xl font-bold text-slate-800">{summary.avg_wait_min} min</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500">Doctors</p><p className="mt-1 text-2xl font-bold text-slate-800">{doctors.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500">Patients</p><p className="mt-1 text-2xl font-bold text-slate-800">{patients.length}</p></Card>
        </div>
      )}

      <Card>
        <CardHeader
          title="Doctor Directory"
          subtitle={`${doctors.filter((d) => (docDept === "all" || d.department === docDept) && d.name.toLowerCase().includes(docSearch.toLowerCase())).length} doctors`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search doctors..." value={docSearch} onChange={(e) => setDocSearch(e.target.value)} className="input-field w-44 pl-8" />
              </div>
              <select value={docDept} onChange={(e) => setDocDept(e.target.value)} className="input-field w-44">
                <option value="all">All departments</option>
                {[...new Set(doctors.map((d) => d.department))].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          }
        />
        <CardBody className="p-0">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white"><tr className="border-b border-surface-border"><th className="table-header">Doctor</th><th className="table-header">Department</th><th className="table-header">Experience</th><th className="table-header">Hours</th><th className="table-header">Room</th><th className="table-header">Status</th><th className="table-header">Today</th><th className="table-header">Active</th></tr></thead>
              <tbody>
                {doctors.filter((d) => (docDept === "all" || d.department === docDept) && d.name.toLowerCase().includes(docSearch.toLowerCase())).map((d) => {
                  const stats = doctorStats.find((s) => s.doctor_id === d.id);
                  const onDuty = d.work_days.split(",").map((x) => x.trim()).includes(String((new Date().getDay() + 6) % 7 + 1));
                  const initials = d.name.replace(/^Dr\.\s*/, "").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={d.id} className="border-b border-surface-border/50 hover:bg-slate-50/50">
                      <td className="table-cell">
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{initials}</span>
                          <span><span className="block font-medium text-slate-800">{d.name}</span><span className="block text-xs text-slate-400">{d.specialty}</span></span>
                        </span>
                      </td>
                      <td className="table-cell">{d.department}</td>
                      <td className="table-cell text-xs">{d.experience_years} yrs</td>
                      <td className="table-cell font-mono text-xs">{d.work_start}–{d.work_end}</td>
                      <td className="table-cell font-mono text-xs">{d.room_number}</td>
                      <td className="table-cell"><Badge variant={onDuty ? "success" : "neutral"} dot>{onDuty ? "On duty" : "Off duty"}</Badge></td>
                      <td className="table-cell text-center font-medium">{stats ? stats.today : "—"}</td>
                      <td className="table-cell text-center font-medium">{stats ? stats.active : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Daily Schedule"
            subtitle="Filter by doctor and day"
            action={
              <div className="flex items-center gap-2">
                <select value={doctorId ?? ""} onChange={(e) => setDoctorId(Number(e.target.value))} className="input-field w-44">
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input type="date" value={day.slice(0, 10)} onChange={(e) => setDay(`${e.target.value}T00:00:00`)} className="input-field w-36" />
                {canWrite && (
                  <Button variant="secondary" onClick={loadDemoDay} icon={<Plus size={14} />}>
                    Fill schedule
                  </Button>
                )}
              </div>
            }
          />
          <CardBody className="p-0">
            {daily.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No appointments for this day.</p>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-surface-border"><th className="table-header">Time</th><th className="table-header">Patient</th><th className="table-header">Type</th><th className="table-header">Priority</th><th className="table-header">Status</th><th className="table-header">Actions</th></tr></thead>
                <tbody>
                  {daily.map((a) => (
                    <tr key={a.id} className="border-b border-surface-border/50">
                      <td className="table-cell font-mono text-xs">{a.start_time.slice(11, 16)}–{a.end_time.slice(11, 16)}</td>
                      <td className="table-cell">{a.patient_name}</td>
                      <td className="table-cell text-xs text-slate-500">{a.appointment_type}</td>
                      <td className="table-cell"><Badge variant={a.priority === "Emergency" ? "danger" : a.priority === "Urgent" ? "warning" : "neutral"}>{a.priority}</Badge></td>
                      <td className="table-cell"><Badge variant={statusVariant[a.status] ?? "neutral"} dot>{a.status}</Badge></td>
                      <td className="table-cell">
                        {canWrite && (a.status === "scheduled" || a.status === "confirmed") && (
                          <span className="flex gap-1">
                            <Button variant="ghost" onClick={() => openReschedule(a)}>Reschedule</Button>
                            <Button variant="ghost" onClick={() => doCancel(a.id)}>Cancel</Button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Patient Queue & Waiting Time" subtitle="wait = position × (avg consult 15 min + 2 min turnover)" action={<Badge variant="info"><Clock size={12} /> Estimated waits</Badge>} />
          <CardBody className="p-0">
            {queue.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Queue is empty for this doctor and day.</p>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-surface-border"><th className="table-header">#</th><th className="table-header">Patient</th><th className="table-header">Time</th><th className="table-header">Est. Wait</th></tr></thead>
                <tbody>
                  {queue.map((q) => (
                    <tr key={q.appointment_id} className="border-b border-surface-border/50">
                      <td className="table-cell text-slate-400">{q.position + 1}</td>
                      <td className="table-cell font-medium">{q.patient_name}</td>
                      <td className="table-cell font-mono text-xs">{q.start_time.slice(11, 16)}</td>
                      <td className="table-cell"><span className="font-mono text-sm font-bold text-teal-700">{q.estimated_wait_min} min</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Book Appointment" subtitle={canWrite ? "Double-booking is rejected by the server (409)." : "Sign in with a staff role to book."} />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select label="Patient" value={String(bookForm.patient_id)} onChange={(e) => setBookForm({ ...bookForm, patient_id: Number(e.target.value) })} options={[{ value: "0", label: "Select patient..." }, ...patients.map((p) => ({ value: String(p.id), label: `${p.name} (#${p.id})` }))]} />
            <Select label="Doctor" value={String(bookForm.doctor_id)} onChange={(e) => setBookForm({ ...bookForm, doctor_id: Number(e.target.value) })} options={[{ value: "0", label: "Select doctor..." }, ...doctors.map((d) => ({ value: String(d.id), label: `${d.name} — ${d.specialty}` }))]} />
            <div className="flex items-end gap-2">
              <Input label="Date" type="date" value={bookForm.date} onChange={(e) => setBookForm({ ...bookForm, date: e.target.value })} />
              <Button variant="secondary" onClick={loadSlots} disabled={!bookForm.doctor_id || !bookForm.date || !canWrite}>Slots</Button>
            </div>
          </div>
          {slots.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Available slots (conflict-free)</p>
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button key={s.start} onClick={() => setBookForm({ ...bookForm, slot: s.start })} className={`rounded-lg border px-3 py-1.5 font-mono text-xs ${bookForm.slot === s.start ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-teal-400"}`}>
                    {s.start.slice(11, 16)}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
                <Input label="Reason" value={bookForm.reason} onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })} placeholder="Follow-up visit" />
                <Select label="Type" value={bookForm.apptType} onChange={(e) => setBookForm({ ...bookForm, apptType: e.target.value })} options={["Consultation", "Follow-up", "Emergency", "Procedure", "Review"].map((t) => ({ value: t, label: t }))} />
                <Select label="Priority" value={bookForm.priority} onChange={(e) => setBookForm({ ...bookForm, priority: e.target.value })} options={["Routine", "Urgent", "Emergency"].map((t) => ({ value: t, label: t }))} />
                <Button onClick={doBook} disabled={!canWrite || !bookForm.patient_id || !bookForm.doctor_id || !bookForm.slot} icon={<Plus size={16} />}>Book</Button>
              </div>
            </div>
          )}
          {canWrite && (
            <div className="mt-6 border-t border-surface-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Register new patient</p>
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <Input label="Name" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} />
                <Input label="Age" type="number" value={newPatient.age} onChange={(e) => setNewPatient({ ...newPatient, age: Number(e.target.value) })} />
                <Input label="Phone" value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} />
                <Button variant="secondary" onClick={async () => {
                  try {
                    const p = await appointmentsApi.createPatient({ name: newPatient.name, age: newPatient.age, gender: "", phone: newPatient.phone, notes: "" });
                    setNotice(`Patient #${p.id} registered.`);
                    refresh();
                  } catch (e) { setError(e instanceof ApiError ? e.message : "Registration failed."); }
                }}>Register</Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Appointment History"
          subtitle="Search and filter past and upcoming records"
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search patient..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field w-44 pl-8" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-36">
                <option value="">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select value={histDept} onChange={(e) => setHistDept(e.target.value)} className="input-field w-40">
                <option value="all">All departments</option>
                {[...new Set(doctors.map((d) => d.department))].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={histType} onChange={(e) => setHistType(e.target.value)} className="input-field w-36">
                <option value="all">All types</option>
                <option value="Consultation">Consultation</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Emergency">Emergency</option>
                <option value="Procedure">Procedure</option>
                <option value="Review">Review</option>
              </select>
            </div>
          }
        />
        <CardBody className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white"><tr className="border-b border-surface-border"><th className="table-header">ID</th><th className="table-header">Patient</th><th className="table-header">Doctor</th><th className="table-header">Date/Time</th><th className="table-header">Type</th><th className="table-header">Priority</th><th className="table-header">Status</th></tr></thead>
              <tbody>
                {history.filter((a) =>
                  a.patient_name.toLowerCase().includes(search.toLowerCase()) &&
                  (histDept === "all" || doctors.find((d) => d.id === a.doctor_id)?.department === histDept) &&
                  (histType === "all" || a.appointment_type === histType)
                ).slice(0, 60).map((a) => (
                  <tr key={a.id} className="border-b border-surface-border/50">
                    <td className="table-cell font-mono text-xs text-slate-400">#{a.id}</td>
                    <td className="table-cell">{a.patient_name}</td>
                    <td className="table-cell text-xs">{a.doctor_name} <span className="text-slate-400">· {a.specialty}</span></td>
                    <td className="table-cell font-mono text-xs">{a.start_time.slice(0, 16).replace("T", " ")}</td>
                    <td className="table-cell text-xs text-slate-500">{a.appointment_type}</td>
                    <td className="table-cell"><Badge variant={a.priority === "Emergency" ? "danger" : a.priority === "Urgent" ? "warning" : "neutral"}>{a.priority}</Badge></td>
                    <td className="table-cell"><Badge variant={statusVariant[a.status] ?? "neutral"} dot>{a.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <Users size={18} className="mt-0.5 shrink-0 text-blue-600" />
            <p className="text-sm text-blue-700">
              Scheduling uses availability windows and overlap checks to assign suitable time slots.
              Booking, rescheduling, cancellation and patient registration require a staff role (admin/doctor/nurse);
              patient lists are only visible when signed in.
            </p>
          </div>
        </CardBody>
      </Card>

      <Dialog
        open={reschedAppt !== null}
        onClose={() => setReschedAppt(null)}
        title={reschedAppt ? `Reschedule #${reschedAppt.id} — ${reschedAppt.patient_name}` : "Reschedule"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReschedAppt(null)}>Close</Button>
            <Button onClick={doReschedule} disabled={!reschedSlot}>Confirm Move</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <Input label="New date" type="date" value={reschedDate} onChange={(e) => { setReschedDate(e.target.value); setReschedSlot(""); loadReschedSlots(e.target.value); }} />
            <Button variant="secondary" onClick={() => loadReschedSlots(reschedDate)}>Slots</Button>
          </div>
          {reschedSlots.length === 0 ? (
            <p className="text-sm text-slate-400">No free slots for this date — pick another day.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {reschedSlots.map((s) => (
                <button key={s.start} onClick={() => setReschedSlot(s.start)} className={`rounded-lg border px-3 py-1.5 font-mono text-xs ${reschedSlot === s.start ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-teal-400"}`}>
                  {s.start.slice(11, 16)}
                </button>
              ))}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
