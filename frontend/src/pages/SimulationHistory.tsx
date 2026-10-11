import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { EmptyState } from "../components/ui/EmptyState";
import { AlertTriangle, FileText, RefreshCw, Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ApiError } from "../services/api";
import { otSchedulingApi, type SimulationSummary, type SurgicalWorkflow } from "../services/api";

const PIE_COLORS = ["#22c08a", "#f59e0b", "#ef4444", "#8b5cf6"];

export function SimulationHistory() {
  const [workflows, setWorkflows] = useState<SurgicalWorkflow[]>([]);
  const [summary, setSummary] = useState<SimulationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wf, sum] = await Promise.all([otSchedulingApi.simulate(75), otSchedulingApi.summary()]);
      setWorkflows(wf);
      setSummary(sum);
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

  const filtered = workflows.filter((w) => {
    const matchSearch =
      String(w.id).includes(search) ||
      w.mamdani_action.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || w.mamdani_action === filterAction;
    return matchSearch && matchAction;
  });

  const actionData = summary ? Object.entries(summary.action_breakdown).map(([name, value]) => ({ name, value })) : [];
  const riskData = summary
    ? Object.entries(summary.risk_distribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulation History & Reports"
        subtitle="75-workflow OT scheduling simulations, reproducibly generated (seed=42)."
        actions={
          <Button variant="secondary" onClick={load} icon={<RefreshCw size={16} />}>
            Re-run Simulation
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

      {summary && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-slate-500">Workflows</p><p className="mt-1 text-2xl font-bold text-slate-800">{summary.total_workflows}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500">Avg Risk</p><p className="mt-1 text-2xl font-bold text-slate-800">{summary.avg_risk_score}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500">Avg Buffer</p><p className="mt-1 text-2xl font-bold text-slate-800">{summary.avg_buffer_extension} min</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500">Actions</p><p className="mt-1 text-sm font-medium text-slate-700">{Object.entries(summary.action_breakdown).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p></Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Scheduling Action Breakdown" subtitle="Simulation results" />
          <CardBody>
            {actionData.length === 0 ? (
              <EmptyState icon={FileText} title="No data" description="Run the simulation to generate results." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={actionData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {actionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Risk Distribution" subtitle="Simulation results" />
          <CardBody>
            {riskData.length === 0 ? (
              <EmptyState icon={FileText} title="No data" description="Run the simulation to generate results." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={riskData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {riskData.map((entry, i) => (
                      <Cell key={i} fill={entry.name === "low" ? "#22c08a" : entry.name === "moderate" ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Workflow Runs"
          subtitle={`${filtered.length} of ${workflows.length} workflows`}
          action={
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search id or action..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field w-48 pl-8" />
              </div>
              <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="input-field w-44">
                <option value="all">All actions</option>
                <option value="Proceed as Scheduled">Proceed as Scheduled</option>
                <option value="Reschedule Elective">Reschedule Elective</option>
                <option value="Emergency Override">Emergency Override</option>
              </select>
            </div>
          }
        />
        <CardBody className="p-0">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-surface-border">
                  <th className="table-header">ID</th>
                  <th className="table-header">Urgency</th>
                  <th className="table-header">Workload</th>
                  <th className="table-header">ICU Cap</th>
                  <th className="table-header">Risk</th>
                  <th className="table-header">Action</th>
                  <th className="table-header">Buffer</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id} className="border-b border-surface-border/50 hover:bg-slate-50/50">
                    <td className="table-cell font-mono text-xs">{w.id}</td>
                    <td className="table-cell">{w.surgical_urgency}</td>
                    <td className="table-cell">{w.surgeon_workload}%</td>
                    <td className="table-cell">{w.icu_capacity}%</td>
                    <td className="table-cell font-medium">{w.mamdani_risk}</td>
                    <td className="table-cell">
                      <Badge variant={w.mamdani_action === "Emergency Override" ? "danger" : w.mamdani_action === "Reschedule Elective" ? "warning" : "success"}>
                        {w.mamdani_action}
                      </Badge>
                    </td>
                    <td className="table-cell">{w.sugeno_buffer} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
