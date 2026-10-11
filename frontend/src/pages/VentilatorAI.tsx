import { useState } from "react";
import { Activity, AlertTriangle, Play } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { ApiError, ventilatorApi, type VentilatorResult } from "../services/api";

const SPO2_SETS = [
  { name: "critical", color: "#ef4444", range: [70, 70, 82] },
  { name: "low", color: "#f59e0b", range: [78, 85, 92] },
  { name: "normal", color: "#22c08a", range: [90, 95, 100] },
];

const RR_SETS = [
  { name: "slow", color: "#3b82f6", range: [10, 10, 16] },
  { name: "normal", color: "#22c08a", range: [14, 20, 26] },
  { name: "rapid", color: "#ef4444", range: [24, 32, 40] },
];

const FLOW_SETS = [
  { name: "low", color: "#22c08a", range: [0, 0, 5] },
  { name: "moderate", color: "#f59e0b", range: [4, 7.5, 11] },
  { name: "high", color: "#ef4444", range: [9, 12, 15] },
];

function buildTrimfData(universe: number[], sets: { name: string; color: string; range: number[] }[]) {
  return universe.map((x) => {
    const point: Record<string, number | string> = { x };
    sets.forEach((s) => {
      const [a, b, c] = s.range;
      let mu = 0;
      if (x >= a && x <= b) mu = b === a ? 1 : (x - a) / (b - a);
      else if (x > b && x <= c) mu = c === b ? 1 : (c - x) / (c - b);
      point[s.name] = Math.round(mu * 1000) / 1000;
    });
    return point;
  });
}

export function VentilatorAI() {
  const [spo2, setSpo2] = useState(84);
  const [rr, setRr] = useState(18);
  const [result, setResult] = useState<VentilatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spo2Universe = Array.from({ length: 31 }, (_, i) => 70 + i);
  const rrUniverse = Array.from({ length: 31 }, (_, i) => 10 + i);
  const flowUniverse = Array.from({ length: 151 }, (_, i) => i * 0.1);

  const spo2ChartData = buildTrimfData(spo2Universe, SPO2_SETS);
  const rrChartData = buildTrimfData(rrUniverse, RR_SETS);
  const flowChartData = buildTrimfData(flowUniverse.map((x) => Math.round(x * 10) / 10), FLOW_SETS);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ventilatorApi.simulate({ spo2, respiration_rate: rr });
      setResult(res);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Failed to connect to backend. Is the FastAPI server running on port 8000?");
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventilator Oxygen Intelligence"
        subtitle="Fuzzy logic oxygen-flow simulator — Mamdani inference with centroid defuzzification."
        actions={<Badge variant="info">Mamdani fuzzy inference</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Input Parameters" subtitle="Enter patient values" />
          <CardBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">SpO2 (%)</label>
                <input
                  type="range"
                  min={70}
                  max={100}
                  value={spo2}
                  onChange={(e) => setSpo2(Number(e.target.value))}
                  className="mt-2 w-full accent-teal-600"
                />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400">70%</span>
                  <span className="text-lg font-bold text-teal-700">{spo2}%</span>
                  <span className="text-xs text-slate-400">100%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Respiration Rate (breaths/min)</label>
                <input
                  type="range"
                  min={10}
                  max={40}
                  value={rr}
                  onChange={(e) => setRr(Number(e.target.value))}
                  className="mt-2 w-full accent-teal-600"
                />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400">10</span>
                  <span className="text-lg font-bold text-teal-700">{rr}</span>
                  <span className="text-xs text-slate-400">40</span>
                </div>
              </div>
              <Button onClick={runSimulation} disabled={loading} className="w-full" icon={<Play size={16} />}>
                {loading ? "Running..." : "Run Simulation"}
              </Button>
              <Button variant="secondary" onClick={async () => {
                setLoading(true);
                try {
                  const res = await ventilatorApi.sample();
                  setResult(res);
                  if (res.sample_input) {
                    setSpo2(res.sample_input.spo2);
                    setRr(res.sample_input.respiration_rate);
                  }
                } catch {
                  setError("Failed to fetch sample");
                } finally {
                  setLoading(false);
                }
              }} disabled={loading} className="w-full">
                Load Sample (SpO2=84%, RR=18)
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Result"
            subtitle="Simulation output with membership degrees and activated rules"
            action={result && <Badge variant="success">Success</Badge>}
          />
          <CardBody>
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                <div>
                  <p className="text-sm font-medium text-rose-800">Simulation Error</p>
                  <p className="mt-1 text-sm text-rose-700">{error}</p>
                </div>
              </div>
            )}
            {!result && !error && (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                Click "Run Simulation" to see results
              </div>
            )}
            {result && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 p-6 text-white">
                  <Activity size={32} />
                  <div>
                    <p className="text-sm opacity-80">Recommended Oxygen Flow</p>
                    <p className="text-3xl font-bold">{result.oxygen_flow} {result.unit}</p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-slate-700">Membership Degrees</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-surface-border p-3">
                      <p className="mb-2 text-xs font-medium text-slate-500">SpO2</p>
                      {result.spo2_memberships.map((m) => (
                        <div key={m.label} className="flex items-center justify-between py-1">
                          <span className="text-sm capitalize text-slate-600">{m.label}</span>
                          <span className="text-sm font-mono font-medium text-slate-800">{m.degree.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-surface-border p-3">
                      <p className="mb-2 text-xs font-medium text-slate-500">Respiration Rate</p>
                      {result.respiration_memberships.map((m) => (
                        <div key={m.label} className="flex items-center justify-between py-1">
                          <span className="text-sm capitalize text-slate-600">{m.label}</span>
                          <span className="text-sm font-mono font-medium text-slate-800">{m.degree.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-slate-700">Activated Rules</h4>
                  <div className="space-y-2">
                    {result.activated_rules.map((rule) => (
                      <div key={rule.rule_number} className="rounded-lg border border-surface-border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">Rule {rule.rule_number}</span>
                          <Badge variant="info">α = {rule.antecedent_degree.toFixed(4)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{rule.description}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Consequent: <span className="font-medium capitalize">{rule.consequent}</span> flow (μ = {rule.consequent_degree.toFixed(4)})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Membership Functions" subtitle="Triangular MFs for all fuzzy sets" />
        <CardBody>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-600">SpO2 Sets</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={spo2ChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  {SPO2_SETS.map((s) => (
                    <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot={false} name={s.name} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-600">Respiration Rate Sets</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={rrChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  {RR_SETS.map((s) => (
                    <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot={false} name={s.name} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-600">Oxygen Flow Output Sets</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={flowChartData.filter((_, i) => i % 5 === 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  {FLOW_SETS.map((s) => (
                    <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot={false} name={s.name} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardBody>
      </Card>

      {result && result.aggregated_output.length > 0 && (
        <Card>
          <CardHeader title="Aggregated Output & Defuzzification" subtitle="Centroid method applied to aggregated membership function" />
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={result.aggregated_output}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="x" tick={{ fontSize: 10 }} label={{ value: "Oxygen Flow (L/min)", position: "insideBottom", offset: -5, fontSize: 11 }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} label={{ value: "Membership", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="membership" stroke="#22c08a" fill="#22c08a" fillOpacity={0.2} name="Aggregated MF" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
