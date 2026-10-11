import { useEffect, useState } from "react";
import { AlertTriangle, FlaskConical, GitBranch, Search } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Select } from "../components/ui/Select";
import { ApiError } from "../services/api";
import { traceApi, type SCGraph, type BatchInfo, type TraversalResult, type RecallReport } from "../services/graphApi";

const TYPE_COLORS: Record<string, string> = {
  supplier: "#64748b",
  manufacturer: "#3b82f6",
  laboratory: "#8b5cf6",
  distribution: "#f59e0b",
  pharmacy: "#0d9488",
};

function sx(x: number) {
  return 30 + x * 48;
}

function sy(y: number) {
  return 30 + (8 - y) * 55;
}

export function MedicineTraceability() {
  const [graph, setGraph] = useState<SCGraph | null>(null);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [startLot, setStartLot] = useState("RM1");
  const [batchId, setBatchId] = useState("BAT-2026-001");
  const [severity, setSeverity] = useState("high");
  const [contamType, setContamType] = useState("chemical");
  const [bfs, setBfs] = useState<TraversalResult | null>(null);
  const [dfs, setDfs] = useState<TraversalResult | null>(null);
  const [recall, setRecall] = useState<RecallReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([traceApi.graph(), traceApi.batches()])
      .then(([g, b]) => {
        setGraph(g);
        setBatches(b);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to connect to backend. Is the FastAPI server running on port 8000?");
        setLoading(false);
      });
  }, []);

  const runTraversal = async (kind: "bfs" | "dfs") => {
    setRunning(true);
    setError(null);
    try {
      const r = kind === "bfs" ? await traceApi.bfs(startLot) : await traceApi.dfs(startLot);
      if (kind === "bfs") setBfs(r);
      else setDfs(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Traversal failed.");
    } finally {
      setRunning(false);
    }
  };

  const runRecall = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await traceApi.recall(batchId, startLot, contamType, severity, `Simulated ${contamType} contamination in lot ${startLot}.`);
      setRecall(r);
      setBfs(r.bfs_result);
      setDfs(r.dfs_result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Recall simulation failed.");
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

  const highlighted = new Set([...(bfs?.visited_order ?? []), ...(dfs?.visited_order ?? [])]);
  const filteredBatches = batches.filter((b) =>
    b.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
    b.batch_id.toLowerCase().includes(search.toLowerCase())
  );

  const maxDepth = (t: TraversalResult | null) =>
    t ? Math.max(0, ...Object.values(t.discovery_depth)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicine Batch Traceability"
        subtitle="BFS downstream tracking + DFS upstream investigation on a simulated supply-chain graph."
        actions={<Badge variant="info">BFS + DFS tracing</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Trace Controls" subtitle="Select lot and run traversals" />
          <CardBody>
            <div className="space-y-4">
              <Select label="Start Lot / Node" value={startLot} onChange={(e) => setStartLot(e.target.value)} options={(graph?.nodes ?? []).map((n) => ({ value: n.id, label: `${n.id} — ${n.name}` }))} />
              <div className="flex gap-2">
                <Button onClick={() => runTraversal("bfs")} disabled={running} variant="secondary" className="flex-1" icon={<GitBranch size={14} />}>BFS</Button>
                <Button onClick={() => runTraversal("dfs")} disabled={running} variant="secondary" className="flex-1" icon={<GitBranch size={14} />}>DFS</Button>
              </div>
              <hr className="border-surface-border" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contamination Alert</p>
              <Select label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} options={batches.map((b) => ({ value: b.batch_id, label: `${b.batch_id} — ${b.medicine_name}` }))} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Type" value={contamType} onChange={(e) => setContamType(e.target.value)} options={[{ value: "chemical", label: "Chemical" }, { value: "microbial", label: "Microbial" }, { value: "particulate", label: "Particulate" }]} />
                <Select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)} options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "critical", label: "Critical" }]} />
              </div>
              <Button onClick={runRecall} disabled={running} className="w-full" icon={<FlaskConical size={16} />}>
                {running ? "Simulating..." : "Simulate Alert + Recall"}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Supply-Chain Graph" subtitle="Directed flow: suppliers → manufacturers → lab → distribution → pharmacies" />
          <CardBody>
            {!graph ? (
              <p className="py-8 text-center text-sm text-slate-400">Graph unavailable.</p>
            ) : (
              <svg viewBox="0 0 600 340" className="w-full rounded-lg border border-surface-border bg-slate-50">
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
                  </marker>
                </defs>
                {graph.edges.map((e, i) => {
                  const a = graph.nodes.find((n) => n.id === e.from_node);
                  const b = graph.nodes.find((n) => n.id === e.to_node);
                  if (!a || !b) return null;
                  const active = highlighted.has(e.from_node) && highlighted.has(e.to_node);
                  return (
                    <line
                      key={i}
                      x1={sx(a.x)}
                      y1={sy(a.y)}
                      x2={sx(b.x)}
                      y2={sy(b.y)}
                      stroke={active ? "#0d9488" : "#cbd5e1"}
                      strokeWidth={active ? 2.5 : 1.2}
                      markerEnd="url(#arrow)"
                    />
                  );
                })}
                {graph.nodes.map((n) => {
                  const hit = highlighted.has(n.id);
                  const isStart = n.id === startLot;
                  return (
                    <g key={n.id} onClick={() => setStartLot(n.id)} style={{ cursor: "pointer" }}>
                      <rect
                        x={sx(n.x) - 26}
                        y={sy(n.y) - 13}
                        width="52"
                        height="26"
                        rx="6"
                        fill={hit ? TYPE_COLORS[n.node_type] ?? "#334155" : "#ffffff"}
                        stroke={isStart ? "#f43f5e" : TYPE_COLORS[n.node_type] ?? "#334155"}
                        strokeWidth={isStart ? 3 : 1.5}
                      />
                      <text x={sx(n.x)} y={sy(n.y) + 3.5} fontSize="9" fontWeight="700" textAnchor="middle" fill={hit ? "#fff" : "#1e293b"}>
                        {n.id}
                      </text>
                      <text x={sx(n.x)} y={sy(n.y) + 24} fontSize="7.5" textAnchor="middle" fill="#64748b">
                        {n.node_type}
                      </text>
                      {(bfs?.discovery_depth[n.id] !== undefined || dfs?.discovery_depth[n.id] !== undefined) && (
                        <text x={sx(n.x) + 28} y={sy(n.y) - 8} fontSize="8" fontWeight="700" fill="#0d9488">
                          d={bfs?.discovery_depth[n.id] ?? dfs?.discovery_depth[n.id]}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              {Object.entries(TYPE_COLORS).map(([t, c]) => (
                <span key={t} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ backgroundColor: c }} />{t}</span>
              ))}
              <span>Click a node to select it. d = discovery depth.</span>
            </div>
          </CardBody>
        </Card>
      </div>

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

      {(bfs || dfs) && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {[
            { title: "BFS — Downstream (level order)", data: bfs, color: "bg-blue-50 text-blue-700" },
            { title: "DFS — Deep connections", data: dfs, color: "bg-violet-50 text-violet-700" },
          ].map((panel) => (
            <Card key={panel.title}>
              <CardHeader
                title={panel.title}
                subtitle={panel.data ? `${panel.data.visited_order.length} nodes · max depth ${maxDepth(panel.data)} · ${panel.data.affected_nodes.length} affected` : "Not run yet"}
              />
              <CardBody>
                {!panel.data ? (
                  <p className="py-4 text-center text-sm text-slate-400">Run {panel.title.startsWith("BFS") ? "BFS" : "DFS"} to see results.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {panel.data.visited_order.map((n, i) => (
                        <Badge key={`${n}-${i}`} variant={i === 0 ? "danger" : "neutral"}>
                          {i + 1}. {n} (d={panel.data!.discovery_depth[n]})
                        </Badge>
                      ))}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-surface-border">
                            <th className="table-header">Node</th>
                            <th className="table-header">Depth</th>
                            <th className="table-header">Predecessor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {panel.data.traversal_tree.map((t) => (
                            <tr key={t.node} className="border-b border-surface-border/50">
                              <td className="table-cell font-mono text-xs font-medium">{t.node}</td>
                              <td className="table-cell text-xs">{t.depth}</td>
                              <td className="table-cell font-mono text-xs text-slate-500">{t.predecessor ?? "— (start)"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {bfs && dfs && (
        <Card>
          <CardHeader title="BFS vs DFS Comparison" subtitle="Same start node, different visit order" />
          <CardBody>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">BFS order</p><p className="mt-1 font-mono text-xs">{bfs.visited_order.join(" → ")}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">DFS order</p><p className="mt-1 font-mono text-xs">{dfs.visited_order.join(" → ")}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Same affected set?</p><p className="mt-1 font-bold text-slate-800">{new Set(bfs.affected_nodes).size === new Set(dfs.affected_nodes).size && bfs.affected_nodes.every((n) => dfs.affected_nodes.includes(n)) ? "Yes" : "No — different coverage"}</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Max depth BFS / DFS</p><p className="mt-1 font-bold text-slate-800">{maxDepth(bfs)} / {maxDepth(dfs)}</p></div>
            </div>
          </CardBody>
        </Card>
      )}

      {recall && (
        <Card>
          <CardHeader
            title={`Recall Report — ${recall.alert_id}`}
            subtitle={`Batch ${recall.batch_id} · lot ${recall.contaminated_lot} · ${recall.severity}`}
            action={<Badge variant={recall.severity === "critical" || recall.severity === "high" ? "danger" : "warning"}>{recall.severity}</Badge>}
          />
          <CardBody>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="text-xs font-semibold text-rose-700">Downstream affected ({recall.downstream_affected.length})</p>
                <p className="mt-1 font-mono text-xs text-rose-800">{recall.downstream_affected.join(", ")}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-semibold text-blue-700">Upstream trace toward source ({recall.upstream_trace.length})</p>
                <p className="mt-1 font-mono text-xs text-blue-800">{recall.upstream_trace.join(" → ")}</p>
              </div>
            </div>
            <p className="mt-3 rounded-lg border border-surface-border bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-semibold">Recommended action: </span>{recall.recommended_action}
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Batch Inventory (Simulated)"
          subtitle={`${filteredBatches.length} batches`}
          action={
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search batches..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field w-48 pl-8" />
            </div>
          }
        />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">Batch</th>
                  <th className="table-header">Medicine</th>
                  <th className="table-header">Raw Lot</th>
                  <th className="table-header">Location</th>
                  <th className="table-header">Qty</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((b) => (
                  <tr key={b.batch_id} className="cursor-pointer border-b border-surface-border/50 hover:bg-slate-50/50" onClick={() => { setBatchId(b.batch_id); }}>
                    <td className="table-cell font-mono text-xs font-medium">{b.batch_id}</td>
                    <td className="table-cell">{b.medicine_name}</td>
                    <td className="table-cell font-mono text-xs">{b.raw_material_lot}</td>
                    <td className="table-cell">{b.current_location}</td>
                    <td className="table-cell text-xs">{b.quantity.toLocaleString()}</td>
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
