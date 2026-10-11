import { ApiError } from "./api";

const BASE_URL = "http://localhost:8000";

async function fetchGraph<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail || `Request failed (${res.status})`, res.status);
  }
  return res.json();
}

export interface EVNode {
  id: string;
  name: string;
  x: number;
  y: number;
  is_charging_station: boolean;
}

export interface EVEdge {
  from_node: string;
  to_node: string;
  distance_km: number;
  elevation_gain_m: number;
  traffic_density: number;
  energy_consumption_kwh: number;
}

export interface EVCharging {
  node_id: string;
  name: string;
  charging_rate_kw: number;
}

export interface EVGraph {
  nodes: EVNode[];
  edges: EVEdge[];
  charging_stations: EVCharging[];
}

export interface EVRouteResult {
  path: string[];
  total_distance_km: number;
  total_energy_kwh: number;
  estimated_time_min: number;
  battery_at_destination: number;
  charging_stops: { node: string; charge_added: number }[];
  node_expansion_order: string[];
  heuristic_explanation: string;
  alternatives: { destination: string; path: string[]; energy_kwh: number }[];
  reachable: boolean;
  error_message: string | null;
}

export const evApi = {
  graph: () => fetchGraph<EVGraph>("/api/ev-routing/graph"),
  route: (start_node: string, end_node: string, battery_capacity: number, current_charge: number) =>
    fetchGraph<EVRouteResult>("/api/ev-routing/route", {
      method: "POST",
      body: JSON.stringify({ start_node, end_node, battery_capacity, current_charge }),
    }),
};

export interface SCNode {
  id: string;
  name: string;
  node_type: string;
  location: string;
  x: number;
  y: number;
}

export interface SCEdge {
  from_node: string;
  to_node: string;
  transport_mode: string;
  distance_km: number;
  transit_time_hours: number;
}

export interface SCGraph {
  nodes: SCNode[];
  edges: SCEdge[];
}

export interface BatchInfo {
  batch_id: string;
  medicine_name: string;
  raw_material_lot: string;
  manufacturer: string;
  production_date: string;
  expiry_date: string;
  quantity: number;
  current_location: string;
}

export interface TraversalResult {
  traversal_type: string;
  start_node: string;
  visited_order: string[];
  discovery_depth: Record<string, number>;
  predecessors: Record<string, string | null>;
  affected_nodes: string[];
  traversal_tree: { node: string; depth: number; predecessor: string | null }[];
}

export interface RecallReport {
  alert_id: string;
  batch_id: string;
  contaminated_lot: string;
  severity: string;
  downstream_affected: string[];
  upstream_trace: string[];
  bfs_result: TraversalResult;
  dfs_result: TraversalResult;
  recommended_action: string;
  generated_at: string;
}

export const traceApi = {
  graph: () => fetchGraph<SCGraph>("/api/traceability/graph"),
  batches: () => fetchGraph<BatchInfo[]>("/api/traceability/batches"),
  bfs: (start_node: string) =>
    fetchGraph<TraversalResult>(`/api/traceability/traverse/bfs?start_node=${encodeURIComponent(start_node)}`, {
      method: "POST",
    }),
  dfs: (start_node: string) =>
    fetchGraph<TraversalResult>(`/api/traceability/traverse/dfs?start_node=${encodeURIComponent(start_node)}`, {
      method: "POST",
    }),
  recall: (batch_id: string, contaminated_lot: string, contamination_type: string, severity: string, description: string) =>
    fetchGraph<RecallReport>("/api/traceability/recall", {
      method: "POST",
      body: JSON.stringify({
        batch_id,
        contaminated_lot,
        contamination_type,
        severity,
        detected_at: new Date().toISOString(),
        description,
      }),
    }),
};
