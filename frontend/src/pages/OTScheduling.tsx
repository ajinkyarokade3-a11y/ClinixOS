import { useState } from "react";
import { Activity, AlertTriangle, Play } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { ApiError, otSchedulingApi, type MamdaniResult, type SugenoResult, type SurgicalWorkflow, type SimulationSummary } from "../services/api";

export function OTScheduling() {
  const [urgency, setUrgency] = useState(7);
  const [workload, setWorkload] = useState(60);
  const [icuCapacity, setIcuCapacity] = useState(40);
  const [mamdaniResult, setMamdaniResult] = useState<MamdaniResult | null>(null);
  const [sugenoResult, setSugenoResult] = useState<SugenoResult | null>(null);
  const [simulationData, setSimulationData] = useState<SurgicalWorkflow[]>([]);
  const [simulationSummary, setSimulationSummary] = useState<SimulationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mamdani, sugeno] = await Promise.all([
        otSchedulingApi.mamdani({ surgical_urgency: urgency, surgeon_workload: workload, icu_capacity: icuCapacity }),
        otSchedulingApi.sugeno({ surgical_urgency: urgency, surgeon_workload: workload, icu_capacity: icuCapacity }),
      ]);
      setMamdaniResult(mamdani);
      setSugenoResult(sugeno);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Failed to connect to backend. Is the FastAPI server running on port 8000?");
      }
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const [workflows, summary] = await Promise.all([
        otSchedulingApi.simulate(75),
        otSchedulingApi.summary(),
      ]);
      setSimulationData(workflows);
      setSimulationSummary(summary);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Failed to connect to backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  const riskChartData = simulationSummary
    ? Object.entries(simulationSummary.risk_distribution).map(([name, value]) => ({ name, value }))
    : [];

  const actionChartData = simulationSummary
    ? Object.entries(simulationSummary.action_breakdown).map(([name, value]) => ({ name, value }))
    : [];

  const PIE_COLORS = ["#22c08a", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="OT Scheduling & ICU Allocation"
        subtitle="Mamdani risk scoring + Sugeno buffer optimization — both models running live."
        actions={<Badge variant="info">Mamdani + Sugeno models</Badge>}
      />

      <Card>
        <CardHeader title="Input Parameters" subtitle="Shared inputs for both inference models" />
        <CardBody>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Surgical Urgency (1-10)</label>
                <input type="range" min={1} max={10} step={0.5} value={urgency} onChange={(e) => setUrgency(Number(e.target.value))} className="mt-2 w-full accent-teal-600" />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400">1 (Elective)</span>
                  <span className="text-lg font-bold text-teal-700">{urgency}</span>
                  <span className="text-xs text-slate-400">10 (Emergency)</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Surgeon Workload (%)</label>
                <input type="range" min={0} max={100} value={workload} onChange={(e) => setWorkload(Number(e.target.value))} className="mt-2 w-full accent-teal-600" />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400">0%</span>
                  <span className="text-lg font-bold text-teal-700">{workload}%</span>
                  <span className="text-xs text-slate-400">100%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">ICU Capacity Available (%)</label>
                <input type="range" min={0} max={100} value={icuCapacity} onChange={(e) => setIcuCapacity(Number(e.target.value))} className="mt-2 w-full accent-teal-600" />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400">0%</span>
                  <span className="text-lg font-bold text-teal-700">{icuCapacity}%</span>
                  <span className="text-xs text-slate-400">100%</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={runModels} disabled={loading} icon={<Play size={16} />}>
                {loading ? "Running..." : "Run Both Models"}
              </Button>
              <Button variant="secondary" onClick={runSimulation} disabled={loading} icon={<Activity size={16} />}>
                Run 75-Workflow Simulation
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {error && (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
              <div>
                <p className="text-sm font-medium text-rose-800">Error</p>
                <p className="mt-1 text-sm text-rose-700">{error}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {mamdaniResult && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Mamdani Model Result" subtitle="Risk score → Scheduling action" action={<Badge variant="success">Success</Badge>} />
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-navy-800 to-navy-900 p-5 text-white">
                  <Activity size={28} />
                  <div>
                    <p className="text-xs opacity-70">Risk Score</p>
                    <p className="text-2xl font-bold">{mamdaniResult.risk_score} / 10</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs opacity-70">Action</p>
                    <p className="text-sm font-bold text-teal-400">{mamdaniResult.scheduling_action}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">Membership Degrees</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { title: "Urgency", data: mamdaniResult.urgency_memberships },
                      { title: "Workload", data: mamdaniResult.workload_memberships },
                      { title: "ICU Capacity", data: mamdaniResult.icu_memberships },
                    ].map((group) => (
                      <div key={group.title} className="rounded-lg border border-surface-border p-2">
                        <p className="mb-1 text-[10px] font-medium text-slate-500">{group.title}</p>
                        {group.data.map((m) => (
                          <div key={m.label} className="flex justify-between py-0.5">
                            <span className="text-xs capitalize text-slate-600">{m.label}</span>
                            <span className="text-xs font-mono text-slate-800">{m.degree.toFixed(3)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">Activated Rules</p>
                  <div className="space-y-2">
                    {mamdaniResult.activated_rules.map((rule) => (
                      <div key={rule.rule_number} className="rounded-lg border border-surface-border p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500">R{rule.rule_number}</span>
                          <Badge variant="info">α={rule.antecedent_degree.toFixed(3)}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-700">{rule.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {sugenoResult && (
            <Card>
              <CardHeader title="Sugeno Model Result" subtitle="Turnover buffer extension" action={<Badge variant="success">Success</Badge>} />
              <CardBody>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 p-5 text-white">
                    <Activity size={28} />
                    <div>
                      <p className="text-xs opacity-80">Buffer Extension</p>
                      <p className="text-2xl font-bold">{sugenoResult.buffer_extension} min</p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-500">Activated Rules</p>
                    <div className="space-y-2">
                      {sugenoResult.activated_rules.map((rule) => (
                        <div key={rule.rule_number} className="rounded-lg border border-surface-border p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500">R{rule.rule_number}</span>
                            <Badge variant="info">w={rule.antecedent_degree.toFixed(3)}</Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-700">{rule.description}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Output: <span className="font-mono font-medium">{rule.output_value} min</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {simulationSummary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-slate-500">Total Workflows</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{simulationSummary.total_workflows}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Avg Risk Score</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{simulationSummary.avg_risk_score}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Avg Buffer Extension</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{simulationSummary.avg_buffer_extension} min</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Risk Levels</p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                Low: {simulationSummary.risk_distribution["low"] || 0} ·
                Mod: {simulationSummary.risk_distribution["moderate"] || 0} ·
                High: {simulationSummary.risk_distribution["high"] || 0}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Scheduling Action Breakdown" subtitle="75 workflows" />
              <CardBody>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={actionChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {actionChartData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Risk Distribution" subtitle="Low / Moderate / High" />
              <CardBody>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={riskChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {riskChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.name === "low" ? "#22c08a" : entry.name === "moderate" ? "#f59e0b" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Workflow Details (first 20)" subtitle="Reproducible data (seed=42)" />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
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
                    {simulationData.slice(0, 20).map((w) => (
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
      )}
    </div>
  );
}
