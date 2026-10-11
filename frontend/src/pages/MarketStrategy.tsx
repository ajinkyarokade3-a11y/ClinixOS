import { useState } from "react";
import { AlertTriangle, Play, TrendingUp } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { Input } from "../components/ui/Input";
import { ApiError } from "../services/api";
import { marketApi, type MarketConfig, type MarketSimulation } from "../services/clinicApi";

export function MarketStrategy() {
  const [cfg, setCfg] = useState<MarketConfig>({
    rounds: 3,
    price_options: [10, 20, 30],
    base_demand: 1000,
    price_sensitivity: 20,
    cross_sensitivity: 8,
    capacity: 500,
    unit_cost: 5,
    fixed_cost_per_round: 100,
    search_depth: 2,
    use_alpha_beta: true,
  });
  const [priceText, setPriceText] = useState("10, 20, 30");
  const [result, setResult] = useState<MarketSimulation | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const prices = priceText.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0);
      if (prices.length < 2) throw new Error("Enter at least 2 positive price options, comma-separated.");
      const r = await marketApi.simulate({ ...cfg, price_options: prices });
      setResult(r);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError(e instanceof Error ? e.message : "Simulation failed. Is the backend running?");
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const set = (k: keyof MarketConfig, v: number | boolean) => setCfg({ ...cfg, [k]: v });

  const treeByParent: Record<string, NonNullable<typeof result>["tree"]> = {};
  if (result) {
    for (const n of result.tree) {
      const key = n.parent_id === null ? "root" : String(n.parent_id);
      (treeByParent[key] = treeByParent[key] || []).push(n);
    }
  }
  const renderTree = (parentKey: string, depth: number): React.ReactNode[] => {
    const nodes = (treeByParent[parentKey] || []).slice(0, 12);
    return nodes.flatMap((n) => [
      <div key={n.id} className="flex items-center gap-2 py-0.5 font-mono text-[11px]" style={{ marginLeft: depth * 18 }}>
        <span className={`rounded px-1.5 py-0.5 ${n.turn === "A" ? "bg-teal-100 text-teal-800" : n.turn === "B" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}>
          {n.turn}
        </span>
        <span className="text-slate-700">{n.move_label}</span>
        <span className="font-bold text-slate-800">v={n.value}</span>
      </div>,
      ...renderTree(String(n.id), depth + 1),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmaceutical Market Strategy"
        subtitle="Two-supplier pricing simulator with configurable demand and competitor response."
        actions={<Badge variant="info">Minimax simulator</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Simulator Configuration" subtitle="Demand, costs and search settings" />
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Rounds (1–6)" type="number" value={cfg.rounds} onChange={(e) => set("rounds", Math.min(6, Math.max(1, Number(e.target.value))))} />
                <Input label="Search depth" type="number" value={cfg.search_depth} onChange={(e) => set("search_depth", Math.min(6, Math.max(1, Number(e.target.value))))} />
              </div>
              <Input label="Price options (comma-separated)" value={priceText} onChange={(e) => setPriceText(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Base demand" type="number" value={cfg.base_demand} onChange={(e) => set("base_demand", Number(e.target.value))} />
                <Input label="Capacity" type="number" value={cfg.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
                <Input label="Price sensitivity" type="number" value={cfg.price_sensitivity} onChange={(e) => set("price_sensitivity", Number(e.target.value))} />
                <Input label="Cross sensitivity" type="number" value={cfg.cross_sensitivity} onChange={(e) => set("cross_sensitivity", Number(e.target.value))} />
                <Input label="Unit cost" type="number" value={cfg.unit_cost} onChange={(e) => set("unit_cost", Number(e.target.value))} />
                <Input label="Fixed cost / round" type="number" value={cfg.fixed_cost_per_round} onChange={(e) => set("fixed_cost_per_round", Number(e.target.value))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={cfg.use_alpha_beta} onChange={(e) => set("use_alpha_beta", e.target.checked)} className="rounded border-slate-300 text-teal-600" />
                Alpha-beta pruning
              </label>
              <Button onClick={run} disabled={running} className="w-full" icon={<Play size={16} />}>
                {running ? "Searching..." : "Run Minimax Simulation"}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Strategy Result"
            subtitle={result ? `Depth ${result.depth} · explored ${result.explored_states} · pruned ${result.pruned_states} · alpha-beta ${result.alpha_beta ? "on" : "off"}` : "Run the simulation to see the recommended strategy"}
            action={result && <Badge variant="success">Best price: {result.best_price}</Badge>}
          />
          <CardBody>
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}
            {!result && !error && <p className="py-10 text-center text-sm text-slate-400">Configure the game and run the simulation.</p>}
            {result && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 p-4 text-white">
                    <p className="text-xs opacity-80">Recommended price</p>
                    <p className="text-2xl font-bold">{result.best_price}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Predicted profit</p><p className="text-xl font-bold text-slate-800">{result.predicted_total_profit.toLocaleString()}</p></div>
                  <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Simulated revenue</p><p className="text-xl font-bold text-slate-800">{result.simulated_total_revenue.toLocaleString()}</p></div>
                  <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Avg market share</p><p className="text-xl font-bold text-slate-800">{(result.simulated_avg_share * 100).toFixed(1)}%</p></div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">Alternative price choices</p>
                  <table className="w-full">
                    <thead><tr className="border-b border-surface-border"><th className="table-header">Price</th><th className="table-header">Predicted profit</th><th className="table-header">Revenue (R1)</th><th className="table-header">Profit (R1)</th><th className="table-header">Share (R1)</th></tr></thead>
                    <tbody>
                      {result.alternatives.map((a) => (
                        <tr key={a.price} className={`border-b border-surface-border/50 ${a.price === result.best_price ? "bg-teal-50/60" : ""}`}>
                          <td className="table-cell font-bold">{a.price} {a.price === result.best_price && <Badge variant="success">best</Badge>}</td>
                          <td className="table-cell font-mono">{a.predicted_total_profit.toLocaleString()}</td>
                          <td className="table-cell font-mono">{a.immediate_revenue.toLocaleString()}</td>
                          <td className="table-cell font-mono">{a.immediate_profit.toLocaleString()}</td>
                          <td className="table-cell font-mono">{(a.immediate_share * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Revenue vs Profit per Round" subtitle="Revenue and profit are distinct — profit subtracts unit and fixed costs" />
              <CardBody>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={result.rounds}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="round" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="revenue" fill="#0d9488" name="Revenue" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="profit" fill="#f59e0b" name="Profit" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Market Share & Prices per Round" subtitle="Our price vs adversarial rival response" />
              <CardBody>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={result.rounds.map((r) => ({ ...r, sharePct: Math.round(r.share * 1000) / 10 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="round" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="our_price" stroke="#0d9488" strokeWidth={2} dot={false} name="Our price" />
                    <Line yAxisId="left" type="monotone" dataKey="rival_price" stroke="#f43f5e" strokeWidth={2} dot={false} name="Rival price" />
                    <Line yAxisId="right" type="monotone" dataKey="sharePct" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Share %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Game Tree (explored states)" subtitle={`${result.tree.length} nodes shown (truncated per branch)`} action={<Badge variant="neutral">A=max · B=min</Badge>} />
              <CardBody>
                <div className="max-h-96 overflow-y-auto rounded-lg border border-surface-border bg-slate-50/50 p-3">
                  {renderTree("root", 0)}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Round-by-Round Simulation" subtitle="Recommended price played every round; rival responds adversarially" />
              <CardBody className="p-0">
                <table className="w-full">
                  <thead><tr className="border-b border-surface-border"><th className="table-header">R</th><th className="table-header">Ours</th><th className="table-header">Rival</th><th className="table-header">Demand</th><th className="table-header">Units</th><th className="table-header">Revenue</th><th className="table-header">Profit</th><th className="table-header">Share</th></tr></thead>
                  <tbody>
                    {result.rounds.map((r) => (
                      <tr key={r.round} className="border-b border-surface-border/50">
                        <td className="table-cell">{r.round}</td>
                        <td className="table-cell font-bold">{r.our_price}</td>
                        <td className="table-cell">{r.rival_price}</td>
                        <td className="table-cell font-mono text-xs">{r.demand}</td>
                        <td className="table-cell font-mono text-xs">{r.units}</td>
                        <td className="table-cell font-mono text-xs">{r.revenue.toLocaleString()}</td>
                        <td className="table-cell font-mono text-xs">{r.profit.toLocaleString()}</td>
                        <td className="table-cell font-mono text-xs">{(r.share * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="space-y-1 p-4">
                  {result.assumptions.map((a, i) => (
                    <p key={i} className="flex items-start gap-2 text-xs text-slate-500"><TrendingUp size={12} className="mt-0.5 shrink-0" />{a}</p>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
