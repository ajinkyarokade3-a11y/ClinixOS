import { ApiError } from "./api";

const BASE_URL = "http://localhost:8000";

async function fetchMaintenance<T>(path: string, options?: RequestInit): Promise<T> {
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

export interface EquipmentItem {
  id: number;
  name: string;
  equipment_type: string;
  department: string;
  operating_hours: number;
  stress_index: number;
  temperature: number | null;
  vibration: number | null;
  risk_score: number;
  maintenance_tier: string;
  fuzzy_risk: number;
  nn_risk: number;
  created_at: string;
}

export interface MaintenanceQueueItem {
  equipment_id: number;
  name: string;
  equipment_type: string;
  department: string;
  risk_score: number;
  maintenance_tier: string;
  operating_hours: number;
  stress_index: number;
}

export interface TrainingResult {
  epochs: number;
  final_loss: number;
  val_loss: number;
  mae: number;
  rmse: number;
  r2_score: number;
  training_history: { epoch: number; loss: number }[];
}

export interface ModelEvaluation {
  mae: number;
  rmse: number;
  r2_score: number;
  mape: number;
  predictions: { actual: number; predicted: number; error: number }[];
}

export const maintenanceApi = {
  inventory: () => fetchMaintenance<EquipmentItem[]>("/api/maintenance/inventory"),
  equipment: (id: number) => fetchMaintenance<EquipmentItem>(`/api/maintenance/equipment/${id}`),
  queue: () => fetchMaintenance<MaintenanceQueueItem[]>("/api/maintenance/queue"),
  history: (id: number) => fetchMaintenance<Array<{ date: string; hours_used: number; stress_index: number; temperature: number; vibration: number }>>(`/api/maintenance/equipment/${id}/history`),
  records: (id: number) => fetchMaintenance<Array<{ id: number; date: string; type: string; technician: string; notes: string; cost: number }>>(`/api/maintenance/equipment/${id}/records`),
  train: () => fetchMaintenance<TrainingResult>("/api/maintenance/train", { method: "POST" }),
  evaluate: () => fetchMaintenance<ModelEvaluation>("/api/maintenance/evaluate"),
};
