import { useEffect, useState } from "react";
import { AlertTriangle, MapPin, Play, Zap } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Select } from "../components/ui/Select";
import { ApiError } from "../services/api";
import { evApi, type EVGraph, type EVRouteResult } from "../services/graphApi";

function sx(x: number) {
  return 40 + x * 26;
}

function sy(y: number) {
  return 40 + (8 - y) * 24;
}

export function EVRouteOptimizer() {
  const [graph, setGraph] = useState<EVGraph | null>(null);
  const [start, setStart] = useState("depot");
  const [dest, setDest] = useState("childrens");
  const [capacity, setCapacity] = useState(60);
  const [charge, setCharge] = useState(50);
  const [result, setResult] = useState<EVRouteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    evApi
      .graph()
      .then((g) => {
        setGraph(g);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to connect to backend. Is the FastAPI server running on port 8000?");
        setLoading(false);
      });
  }, []);

  const runRoute = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await evApi.route(start, dest, capacity, Math.min(charge, capacity));
      setResult(r);
      if (!r.reachable) setError(r.error_message || "No feasible route found.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to connect to backend.");
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );

  const pathSet = new Set(result?.path ?? []);
  const pathEdges = new Set<string>();
  if (result) {
    for (let i = 0; i < result.path.length - 1; i++) {
      pathEdges.add(`${result.path[i]}-${result.path[i + 1]}`);
      pathEdges.add(`${result.path[i + 1]}-${result.path[i]}`);
    }
  }
  const expansionIndex: Record<string, number> = {};
  result?.node_expansion_order.forEach((n, i) => {
    if (!(n in expansionIndex)) expansionIndex[n] = i + 1;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital EV Route Optimizer"
        subtitle="A* search on a schematic road network — simulated distances, elevation and traffic."
        actions={<Badge variant="info">A* search</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Route Inputs" subtitle="Select nodes and battery state" />
          <CardBody>
            <div className="space-y-4">
              <Select
                label="Start Node"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                options={(graph?.nodes ?? []).map((n) => ({ value: n.id, label: `${n.id} — ${n.name}` }))}
              />
              <Select
                label="Destination Node"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                options={(graph?.nodes ?? []).map((n) => ({ value: n.id, label: `${n.id} — ${n.name}` }))}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700">Battery Capacity (kWh): {capacity}</label>
                <input type="range" min={10} max={120} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="mt-2 w-full accent-teal-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Current Charge (kWh): {Math.min(charge, capacity)}</label>
                <input type="range" min={0} max={capacity} value={Math.min(charge, capacity)} onChange={(e) => setCharge(Number(e.target.value))} className="mt-2 w-full accent-teal-600" />
              </div>
              <Button onClick={runRoute} disabled={running || !graph} className="w-full" icon={<Play size={16} />}>
                {running ? "Searching..." : "Find Optimal Route"}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Schematic Road Network" subtitle="Labelled diagram — not a live geographic map" />
          <CardBody>
            {!graph ? (
              <p className="py-8 text-center text-sm text-slate-400">Graph unavailable.</p>
            ) : (
              <svg viewBox="0 0 600 380" className="w-full rounded-lg border border-surface-border bg-slate-50">
                {graph.edges.map((e, i) => {
                  const a = graph.nodes.find((n) => n.id === e.from_node);
                  const b = graph.nodes.find((n) => n.id === e.to_node);
                  if (!a || !b) return null;
                  const onPath = pathEdges.has(`${e.from_node}-${e.to_node}`);
                  return (
                    <g key={i}>
                      <line
                        x1={sx(a.x)}
                        y1={sy(a.y)}
                        x2={sx(b.x)}
                        y2={sy(b.y)}
                        stroke={onPath ? "#0d9488" : "#cbd5e1"}
                        strokeWidth={onPath ? 3.5 : 1.5}
                      />
                      <text
                        x={(sx(a.x) + sx(b.x)) / 2}
                        y={(sy(a.y) + sy(b.y)) / 2 - 4}
                        fontSize="8"
                        fill="#64748b"
                        textAnchor="middle"
                      >
                        {e.distance_km}km
                      </text>
                    </g>
                  );
                })}
                {graph.nodes.map((n) => {
                  const isStart = n.id === start;
                  const isDest = n.id === dest;
                  const onPath = pathSet.has(n.id);
                  const fill = isStart ? "#0d9488" : isDest ? "#f43f5e" : n.is_charging_station ? "#f59e0b" : onPath ? "#0d9488" : "#ffffff";
                  return (
                    <g key={n.id}>
                      <circle
                        cx={sx(n.x)}
                        cy={sy(n.y)}
                        r={onPath ? 11 : 9}
                        fill={fill}
                        stroke={onPath && !isStart && !isDest ? "#0d9488" : "#334155"}
                        strokeWidth={onPath ? 2.5 : 1.5}
                      />
                      {n.is_charging_station && (
                        <text x={sx(n.x)} y={sy(n.y) + 3.5} fontSize="9" textAnchor="middle" fill="#fff">
                          <Zap size={8} />
                        </text>
                      )}
                      <text x={sx(n.x)} y={sy(n.y) - 14} fontSize="9" fontWeight="600" textAnchor="middle" fill="#1e293b">
                        {n.id}
                      </text>
                      {expansionIndex[n.id] && (
                        <text x={sx(n.x) + 12} y={sy(n.y) + 12} fontSize="8" fill="#0d9488" fontWeight="700">
                          #{expansionIndex[n.id]}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> Start / path</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Destination</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Charging station</span>
              <span className="flex items-center gap-1.5"><MapPin size={12} /> # = A* expansion order</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {error && (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
              <div>
                <p className="text-sm font-medium text-rose-800">Routing Result</p>
                <p className="mt-1 text-sm text-rose-700">{error}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {result && result.reachable && (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
            <Card className="p-4"><p className="text-xs text-slate-500">Path</p><p className="mt-1 font-mono text-sm font-bold text-teal-700">{result.path.join(" → ")}</p></Card>
            <Card className="p-4"><p className="text-xs text-slate-500">Distance</p><p className="mt-1 text-2xl font-bold text-slate-800">{result.total_distance_km} km</p></Card>
            <Card className="p-4"><p className="text-xs text-slate-500">Energy</p><p className="mt-1 text-2xl font-bold text-slate-800">{result.total_energy_kwh} kWh</p></Card>
            <Card className="p-4"><p className="text-xs text-slate-500">Battery at Arrival</p><p className="mt-1 text-2xl font-bold text-slate-800">{result.battery_at_destination} kWh</p></Card>
            <Card className="p-4"><p className="text-xs text-slate-500">Est. Time</p><p className="mt-1 text-2xl font-bold text-slate-800">{result.estimated_time_min} min</p></Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Node Expansion Order" subtitle="Order in which A* expanded nodes" />
              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {result.node_expansion_order.map((n, i) => (
                    <Badge key={`${n}-${i}`} variant={result.path.includes(n) ? "success" : "neutral"}>
                      {i + 1}. {n}
                    </Badge>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">{result.heuristic_explanation}</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Charging Stops & Alternatives" subtitle="Battery plan and nearby destinations" />
              <CardBody>
                {result.charging_stops.length === 0 ? (
                  <p className="text-sm text-slate-500">No charging stops required for this route.</p>
                ) : (
                  <div className="space-y-2">
                    {result.charging_stops.map((s, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm">
                        <span className="flex items-center gap-2 font-medium text-amber-800"><Zap size={14} /> {s.node}</span>
                        <span className="font-mono text-amber-800">+{s.charge_added} kWh</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {result.alternatives.map((a) => (
                    <div key={a.destination} className="flex items-center justify-between rounded-lg border border-surface-border p-2 text-sm">
                      <span className="text-slate-700">→ {a.destination} <span className="font-mono text-xs text-slate-400">{a.path.join(" → ")}</span></span>
                      <span className="font-mono text-slate-600">{a.energy_kwh} kWh</span>
                    </div>
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
