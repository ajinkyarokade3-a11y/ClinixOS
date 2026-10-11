const BASE_URL = "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
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

// ── Ventilator ──

export interface VentilatorInput {
  spo2: number;
  respiration_rate: number;
}

export interface VentilatorResult {
  oxygen_flow: number;
  unit: string;
  spo2_memberships: { label: string; degree: number }[];
  respiration_memberships: { label: string; degree: number }[];
  activated_rules: {
    rule_number: number;
    description: string;
    antecedent_degree: number;
    consequent: string;
    consequent_degree: number;
  }[];
  aggregated_output: { x: number; membership: number }[];
  defuzzification_method: string;
  sample_input: Record<string, number> | null;
}

export const ventilatorApi = {
  simulate: (input: VentilatorInput) =>
    fetchApi<VentilatorResult>("/api/ventilator/simulate", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  sample: () => fetchApi<VentilatorResult>("/api/ventilator/sample"),
};

// ── OT Scheduling ──

export interface OTSchedulingInput {
  surgical_urgency: number;
  surgeon_workload: number;
  icu_capacity: number;
}

export interface MamdaniResult {
  risk_score: number;
  scheduling_action: string;
  urgency_memberships: { label: string; degree: number }[];
  workload_memberships: { label: string; degree: number }[];
  icu_memberships: { label: string; degree: number }[];
  activated_rules: {
    rule_number: number;
    description: string;
    antecedent_degree: number;
    risk_level: string;
    risk_degree: number;
  }[];
  defuzzification_method: string;
}

export interface SugenoResult {
  buffer_extension: number;
  unit: string;
  activated_rules: {
    rule_number: number;
    description: string;
    antecedent_degree: number;
    output_value: number;
    weight: number;
  }[];
  defuzzification_method: string;
}

export interface SurgicalWorkflow {
  id: number;
  surgical_urgency: number;
  surgeon_workload: number;
  icu_capacity: number;
  mamdani_risk: number;
  mamdani_action: string;
  sugeno_buffer: number;
}

export interface SimulationSummary {
  total_workflows: number;
  action_breakdown: Record<string, number>;
  risk_distribution: Record<string, number>;
  avg_buffer_extension: number;
  avg_risk_score: number;
}

export const otSchedulingApi = {
  mamdani: (input: OTSchedulingInput) =>
    fetchApi<MamdaniResult>("/api/ot-scheduling/mamdani", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  sugeno: (input: OTSchedulingInput) =>
    fetchApi<SugenoResult>("/api/ot-scheduling/sugeno", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  simulate: (count: number = 75) =>
    fetchApi<SurgicalWorkflow[]>(`/api/ot-scheduling/simulate?count=${count}`, {
      method: "POST",
    }),
  summary: () => fetchApi<SimulationSummary>("/api/ot-scheduling/simulate/summary"),
};
