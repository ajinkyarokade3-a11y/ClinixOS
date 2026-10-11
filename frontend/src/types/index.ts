export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

export interface KpiCard {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral" | "warning";
  icon: string;
  color: string;
}

export interface Appointment {
  id: string;
  patient: string;
  doctor: string;
  department: string;
  date: string;
  time: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
}

export interface Equipment {
  id: string;
  name: string;
  department: string;
  status: "operational" | "maintenance" | "critical" | "offline";
  lastMaintenance: string;
  nextMaintenance: string;
  healthScore: number;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  timestamp: string;
  module: string;
}

export interface SimulationRun {
  id: string;
  name: string;
  module: string;
  status: "completed" | "running" | "failed" | "queued";
  startedAt: string;
  duration: string;
  parameters: Record<string, string>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "doctor" | "nurse" | "technician" | "viewer";
  department: string;
  status: "active" | "inactive";
  lastLogin: string;
}

export interface Batch {
  id: string;
  medicine: string;
  batchNumber: string;
  manufacturer: string;
  expiryDate: string;
  quantity: number;
  status: "in-stock" | "low-stock" | "expired" | "recalled";
  location: string;
}

export interface RouteStop {
  id: string;
  name: string;
  type: "hospital" | "depot" | "charging";
  distance: number;
  time: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}
