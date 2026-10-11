import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle, Brain, RefreshCw, Search, Wrench,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";
import { maintenanceApi, type EquipmentItem, type MaintenanceQueueItem, type TrainingResult, type ModelEvaluation } from "../services/maintenanceApi";

const PIE_COLORS = ["#22c08a", "#f59e0b", "#ef4444"];

export function PredictiveMaintenance() {
  const [inventory, setInventory] = useState<EquipmentItem[]>([]);
  const [queue, setQueue] = useState<MaintenanceQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [history, setHistory] = useState<Array<{ date: string; hours_used: number; stress_index: number; temperature: number; vibration: number }>>([]);
  const [records, setRecords] = useState<Array<{ id: number; date: string; type: string; technician: string; notes: string; cost: number }>>([]);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [evaluation, setEvaluation] = useState<ModelEvaluation | null>(null);
  const [training, setTraining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, q] = await Promise.all([maintenanceApi.inventory(), maintenanceApi.queue()]);
      setInventory(inv);
      setQueue(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadEquipmentDetail = async (id: number) => {
    try {
      const [eq, hist, recs] = await Promise.all([
        maintenanceApi.equipment(id),
        maintenanceApi.history(id),
        maintenanceApi.records(id),
      ]);
      setSelectedEquipment(eq);
      setHistory(hist);
      setRecords(recs);
      setActionError(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to load equipment details.");
    }
  };

  const runTraining = async () => {
    setTraining(true);
    try {
      const [trainRes, evalRes] = await Promise.all([maintenanceApi.train(), maintenanceApi.evaluate()]);
      setTrainingResult(trainRes);
      setEvaluation(evalRes);
      setActionError(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Model training failed.");
    } finally {
      setTraining(false);
    }
  };

  const filteredInventory = inventory.filter((eq) => {
    const matchSearch = eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.equipment_type.toLowerCase().includes(search.toLowerCase());
    const matchTier = filterTier === "all" || eq.maintenance_tier === filterTier;
    const matchDept = filterDept === "all" || eq.department === filterDept;
    return matchSearch && matchTier && matchDept;
  });

  const departments = [...new Set(inventory.map((e) => e.department))];
  const tierCounts = inventory.reduce((acc, eq) => {
    acc[eq.maintenance_tier] = (acc[eq.maintenance_tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const tierChartData = Object.entries(tierCounts).map(([name, value]) => ({ name, value }));

  const riskDistribution = inventory.reduce((acc, eq) => {
    const range = eq.risk_score < 30 ? "0-30" : eq.risk_score < 65 ? "30-65" : "65-100";
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const riskChartData = Object.entries(riskDistribution).map(([name, value]) => ({ name, value }));

  if (loading) return <PageLoading />;
  if (error) return <ErrorState title="Failed to load maintenance data" message={error} onRetry={loadData} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biomedical Predictive Maintenance"
        subtitle="Hybrid Neuro-Fuzzy System (HNFS) — Sugeno fuzzy + neural network for failure-risk estimation."
        actions={
          <>
            <Button variant="secondary" onClick={runTraining} disabled={training} icon={<Brain size={16} />}>
              {training ? "Training..." : "Train Model"}
            </Button>
            <Button variant="secondary" onClick={loadData} icon={<RefreshCw size={16} />}>
              Refresh
            </Button>
          </>
        }
      />

      {actionError && (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
              <p className="text-sm text-rose-700">{actionError}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Total Equipment</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{inventory.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Routine Check</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{tierCounts["Routine Check"] || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Preventive Maintenance</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{tierCounts["Preventive Maintenance"] || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Immediate Servicing</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{tierCounts["Immediate Servicing"] || 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Maintenance Tier Distribution" subtitle="Equipment count by tier" />
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={tierChartData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {tierChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Risk Score Distribution" subtitle="Equipment count by risk range" />
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {riskChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.name === "0-30" ? "#22c08a" : entry.name === "30-65" ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Maintenance Queue" subtitle="Ordered by urgency (highest risk first)" action={<Badge variant="warning">{queue.length} items</Badge>} />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">#</th>
                  <th className="table-header">Equipment</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Risk Score</th>
                  <th className="table-header">Tier</th>
                  <th className="table-header">Hours</th>
                  <th className="table-header">Stress</th>
                </tr>
              </thead>
              <tbody>
                {queue.slice(0, 15).map((item, idx) => (
                  <tr key={item.equipment_id} className="border-b border-surface-border/50 hover:bg-slate-50/50">
                    <td className="table-cell text-xs text-slate-400">{idx + 1}</td>
                    <td className="table-cell font-medium text-slate-800">{item.name}</td>
                    <td className="table-cell">{item.equipment_type}</td>
                    <td className="table-cell">{item.department}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${item.risk_score}%`, backgroundColor: item.risk_score > 65 ? "#ef4444" : item.risk_score > 30 ? "#f59e0b" : "#22c08a" }} />
                        </div>
                        <span className="text-xs font-mono">{item.risk_score}%</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge variant={item.maintenance_tier === "Immediate Servicing" ? "danger" : item.maintenance_tier === "Preventive Maintenance" ? "warning" : "success"} dot>
                        {item.maintenance_tier}
                      </Badge>
                    </td>
                    <td className="table-cell text-xs">{item.operating_hours.toLocaleString()}</td>
                    <td className="table-cell text-xs">{item.stress_index}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Equipment Inventory"
          subtitle={`${filteredInventory.length} of ${inventory.length} items`}
          action={
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field w-40 pl-8" />
              </div>
              <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)} className="input-field w-40">
                <option value="all">All Tiers</option>
                <option value="Routine Check">Routine Check</option>
                <option value="Preventive Maintenance">Preventive Maintenance</option>
                <option value="Immediate Servicing">Immediate Servicing</option>
              </select>
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="input-field w-36">
                <option value="all">All Departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          }
        />
        <CardBody className="p-0">
          {filteredInventory.length === 0 ? (
            <EmptyState icon={Wrench} title="No equipment found" description="Try adjusting your search or filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="table-header">Name</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Department</th>
                    <th className="table-header">Hours</th>
                    <th className="table-header">Stress</th>
                    <th className="table-header">Fuzzy Risk</th>
                    <th className="table-header">NN Risk</th>
                    <th className="table-header">Combined</th>
                    <th className="table-header">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((eq) => (
                    <tr key={eq.id} className="cursor-pointer border-b border-surface-border/50 hover:bg-slate-50/50" onClick={() => loadEquipmentDetail(eq.id)}>
                      <td className="table-cell font-medium text-slate-800">{eq.name}</td>
                      <td className="table-cell">{eq.equipment_type}</td>
                      <td className="table-cell">{eq.department}</td>
                      <td className="table-cell text-xs">{eq.operating_hours.toLocaleString()}</td>
                      <td className="table-cell text-xs">{eq.stress_index}%</td>
                      <td className="table-cell text-xs font-mono">{eq.fuzzy_risk}%</td>
                      <td className="table-cell text-xs font-mono">{eq.nn_risk}%</td>
                      <td className="table-cell">
                        <span className="text-sm font-bold" style={{ color: eq.risk_score > 65 ? "#ef4444" : eq.risk_score > 30 ? "#f59e0b" : "#22c08a" }}>
                          {eq.risk_score}%
                        </span>
                      </td>
                      <td className="table-cell">
                        <Badge variant={eq.maintenance_tier === "Immediate Servicing" ? "danger" : eq.maintenance_tier === "Preventive Maintenance" ? "warning" : "success"} dot>
                          {eq.maintenance_tier}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {selectedEquipment && (
        <Card>
          <CardHeader title={`${selectedEquipment.name} — Detail`} subtitle={`${selectedEquipment.equipment_type} · ${selectedEquipment.department}`} action={<Button variant="ghost" onClick={() => setSelectedEquipment(null)}>Close</Button>} />
          <CardBody>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-700">Usage History (30 days)</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={history.slice(0, 14).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="hours_used" stroke="#22c08a" strokeWidth={2} dot={false} name="Hours" />
                    <Line type="monotone" dataKey="stress_index" stroke="#f59e0b" strokeWidth={2} dot={false} name="Stress" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-700">Maintenance Records</h4>
                <div className="space-y-2">
                  {records.slice(0, 5).map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between rounded-lg border border-surface-border p-2">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{rec.type}</p>
                        <p className="text-[10px] text-slate-400">{rec.date} · {rec.technician}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-600">₹{rec.cost.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {trainingResult && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Training Results" subtitle={`${trainingResult.epochs} epochs`} action={<Badge variant="success">Complete</Badge>} />
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Final Loss</p>
                  <p className="text-lg font-bold text-slate-800">{trainingResult.final_loss.toFixed(6)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Val Loss</p>
                  <p className="text-lg font-bold text-slate-800">{trainingResult.val_loss.toFixed(6)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">MAE</p>
                  <p className="text-lg font-bold text-slate-800">{trainingResult.mae}%</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">R² Score</p>
                  <p className="text-lg font-bold text-slate-800">{trainingResult.r2_score.toFixed(4)}</p>
                </div>
              </div>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={trainingResult.training_history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="epoch" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="loss" stroke="#22c08a" fill="#22c08a" fillOpacity={0.15} name="Loss" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {evaluation && (
            <Card>
              <CardHeader title="Model Evaluation" subtitle="Test set performance" action={<Badge variant="info">MAE: {evaluation.mae}%</Badge>} />
              <CardBody>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">RMSE</p>
                    <p className="text-lg font-bold text-slate-800">{evaluation.rmse}%</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">MAPE</p>
                    <p className="text-lg font-bold text-slate-800">{evaluation.mape}%</p>
                  </div>
                </div>
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={evaluation.predictions.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="actual" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="predicted" fill="#22c08a" radius={[2, 2, 0, 0]} name="Predicted" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardBody>
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <Wrench size={18} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">About this module</p>
              <p className="mt-1 text-sm text-blue-700">
                Hybrid neuro-fuzzy risk scoring combines fuzzy rules with a trained neural network.
                Tiers guide maintenance scheduling: Routine Check, Preventive Maintenance, Immediate Servicing.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
