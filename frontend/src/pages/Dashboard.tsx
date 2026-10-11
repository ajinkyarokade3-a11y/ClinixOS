import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CalendarCheck, Package, RefreshCw, Wrench } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { EmptyState } from "../components/ui/EmptyState";
import { ApiError } from "../services/api";
import { appointmentsApi, type Appointment } from "../services/clinicApi";
import { maintenanceApi, type MaintenanceQueueItem } from "../services/maintenanceApi";
import { otSchedulingApi, type SimulationSummary } from "../services/api";
import { traceApi, type BatchInfo } from "../services/graphApi";

interface Alert {
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  module: string;
}

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apptTotal, setApptTotal] = useState(0);
  const [avgWait, setAvgWait] = useState(0);
  const [recentAppts, setRecentAppts] = useState<Appointment[]>([]);
  const [trend, setTrend] = useState<{ name: string; value: number }[]>([]);
  const [queue, setQueue] = useState<MaintenanceQueueItem[]>([]);
  const [otSummary, setOtSummary] = useState<SimulationSummary | null>(null);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [bySpecialty, setBySpecialty] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const t = new Date();
      const todayISO = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T00:00:00`;
      const [summary, daily, hist, q, ot, batchList] = await Promise.all([
        appointmentsApi.summary().catch(() => null),
        appointmentsApi.daily(undefined, todayISO).catch(() => [] as Appointment[]),
        appointmentsApi.history().catch(() => [] as Appointment[]),
        maintenanceApi.queue().catch(() => [] as MaintenanceQueueItem[]),
        otSchedulingApi.summary().catch(() => null),
        traceApi.batches().catch(() => [] as BatchInfo[]),
      ]);
      setApptTotal(summary?.total ?? 0);
      setAvgWait(summary?.avg_wait_min ?? 0);
      setByStatus(summary?.by_status ?? {});
      setBySpecialty(summary?.by_specialty ?? {});
      setRecentAppts(daily.slice(0, 6));
      setQueue(q);
      setOtSummary(ot);
      setBatches(batchList);

      const buckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        buckets[d.toISOString().slice(0, 10)] = 0;
      }
      for (const a of hist) {
        const day = a.start_time.slice(0, 10);
        if (day in buckets) buckets[day] += 1;
      }
      setTrend(Object.entries(buckets).map(([name, value]) => ({ name: name.slice(5), value })));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );

  const immediateCount = queue.filter((q) => q.maintenance_tier === "Immediate Servicing").length;
  const preventiveCount = queue.filter((q) => q.maintenance_tier === "Preventive Maintenance").length;
  const now = Date.now();
  const expiring = batches.filter((b) => {
    const t = new Date(b.expiry_date).getTime();
    return t - now < 120 * 86400000;
  });

  const alerts: Alert[] = [
    ...queue.filter((q) => q.maintenance_tier === "Immediate Servicing").slice(0, 3).map((q) => ({
      severity: "critical" as const,
      title: `${q.name} needs immediate servicing`,
      message: `Risk score ${q.risk_score}% · ${q.department} · ${q.operating_hours.toLocaleString()} operating hours.`,
      module: "Maintenance",
    })),
    ...expiring.slice(0, 2).map((b) => ({
      severity: "warning" as const,
      title: `${b.medicine_name} batch expiring soon`,
      message: `${b.batch_id} expires ${b.expiry_date} · ${b.quantity.toLocaleString()} units at ${b.current_location}.`,
      module: "Pharmacy",
    })),
    ...(otSummary
      ? [{
          severity: "info" as const,
          title: "OT simulation refreshed",
          message: `${otSummary.total_workflows} reproducible workflows · avg risk ${otSummary.avg_risk_score} · avg buffer ${otSummary.avg_buffer_extension} min.`,
          module: "OT Scheduling",
        }]
      : []),
  ];

  const tierData = [
    { name: "Routine Check", value: queue.filter((q) => q.maintenance_tier === "Routine Check").length, color: "#22c08a" },
    { name: "Preventive", value: preventiveCount, color: "#f59e0b" },
    { name: "Immediate", value: immediateCount, color: "#ef4444" },
  ];
  const deptData = Object.entries(bySpecialty).map(([name, value]) => ({ name, value }));
  const doneTotal = (byStatus["completed"] ?? 0) + (byStatus["cancelled"] ?? 0) + (byStatus["scheduled"] ?? 0) + (byStatus["confirmed"] ?? 0);
  const completionRate = doneTotal > 0 ? Math.round(((byStatus["completed"] ?? 0) / doneTotal) * 100) : 0;
  const cancelRate = doneTotal > 0 ? Math.round(((byStatus["cancelled"] ?? 0) / doneTotal) * 100) : 0;
  const riskData = otSummary
    ? Object.entries(otSummary.risk_distribution).map(([name, value]) => ({
        name,
        value,
        color: name === "low" ? "#22c08a" : name === "moderate" ? "#f59e0b" : "#ef4444",
      }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview Dashboard"
        subtitle="Operational picture aggregated from all hospital modules."
        actions={
          <Button variant="secondary" onClick={load} icon={<RefreshCw size={16} />}>
            Refresh
          </Button>
        }
      />

      {error && (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's Appointments" value={String(apptTotal)} change={`Avg est. wait ${avgWait} min`} changeType="neutral" icon={CalendarCheck} iconColor="bg-teal-50 text-teal-700" />
        <StatCard title="Surgical Workflows" value={otSummary ? String(otSummary.total_workflows) : "—"} change={otSummary ? `Avg risk ${otSummary.avg_risk_score}` : "Unavailable"} changeType="neutral" icon={Activity} iconColor="bg-blue-50 text-blue-700" />
        <StatCard title="Equipment Flags" value={String(immediateCount + preventiveCount)} change={`${immediateCount} immediate servicing`} changeType={immediateCount > 0 ? "negative" : "positive"} icon={Wrench} iconColor="bg-amber-50 text-amber-700" />
        <StatCard title="Supply-Chain Alerts" value={String(expiring.length)} change="Batches expiring < 120 days" changeType={expiring.length > 0 ? "warning" : "positive"} icon={Package} iconColor="bg-rose-50 text-rose-700" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Appointment Volume (7 days)" subtitle="Booking records" />
          <CardBody>
            {trend.every((t) => t.value === 0) ? (
              <EmptyState icon={CalendarCheck} title="No appointments yet" description="Book appointments from the Appointments page — this chart fills in automatically." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} name="Appointments" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="OT Risk Distribution" subtitle="75-workflow simulation" />
          <CardBody>
            {riskData.length === 0 ? (
              <EmptyState icon={Activity} title="No data available" description="Run a simulation from OT Scheduling to populate this chart." />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {riskData.map((r) => (
                    <div key={r.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />{r.name}</span>
                      <span className="font-medium">{r.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Today's Appointments" subtitle="Booking records" />
          <CardBody className="p-0">
            {recentAppts.length === 0 ? (
              <EmptyState icon={CalendarCheck} title="No appointments today" description="Book one from the Appointments page." />
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-surface-border"><th className="table-header">Time</th><th className="table-header">Patient</th><th className="table-header">Doctor</th><th className="table-header">Status</th></tr></thead>
                <tbody>
                  {recentAppts.map((a) => (
                    <tr key={a.id} className="border-b border-surface-border/50">
                      <td className="table-cell font-mono text-xs">{a.start_time.slice(11, 16)}</td>
                      <td className="table-cell font-medium">{a.patient_name}</td>
                      <td className="table-cell text-xs">{a.doctor_name}</td>
                      <td className="table-cell"><Badge variant={a.status === "cancelled" ? "danger" : a.status === "completed" ? "neutral" : "info"} dot>{a.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Active Alerts" subtitle="Derived from live equipment and pharmacy data" action={<Badge variant={alerts.length > 0 ? "warning" : "success"}>{alerts.length} active</Badge>} />
          <CardBody>
            {alerts.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="All clear" description="No equipment or supply-chain alerts right now." />
            ) : (
              <div className="space-y-3">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-surface-border p-3">
                    <AlertTriangle size={16} className={`mt-0.5 ${a.severity === "critical" ? "text-rose-500" : a.severity === "warning" ? "text-amber-500" : "text-blue-500"}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{a.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{a.message}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{a.module}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Department Workload" subtitle="Today's appointments by specialty" />
          <CardBody>
            {deptData.length === 0 ? (
              <EmptyState icon={Activity} title="No workload data" description="Book appointments to populate department figures." />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} name="Appointments" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Completion & Cancellation" subtitle="Rates across all recorded appointments" />
          <CardBody>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Completed</span>
                  <span className="font-bold text-emerald-600">{completionRate}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Cancelled</span>
                  <span className="font-bold text-rose-600">{cancelRate}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: `${cancelRate}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                {Object.entries(byStatus).map(([s, v]) => (
                  <div key={s} className="rounded-lg bg-slate-50 p-2">
                    <p className="text-lg font-bold text-slate-800">{v}</p>
                    <p className="text-[11px] capitalize text-slate-500">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Equipment Maintenance Tiers" subtitle="HNFS risk assessment across the inventory" />
        <CardBody>
          {queue.length === 0 ? (
            <EmptyState icon={Wrench} title="No equipment data" description="No data available right now." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tierData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {tierData.map((t, i) => <Cell key={i} fill={t.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
