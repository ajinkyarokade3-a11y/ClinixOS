import { Navigate, Route, Routes } from "react-router-dom";
import { RootLayout } from "./components/layout/RootLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { VentilatorAI } from "./pages/VentilatorAI";
import { OTScheduling } from "./pages/OTScheduling";
import { PredictiveMaintenance } from "./pages/PredictiveMaintenance";
import { Appointments } from "./pages/Appointments";
import { EVRouteOptimizer } from "./pages/EVRouteOptimizer";
import { MedicineTraceability } from "./pages/MedicineTraceability";
import { PharmacyLM } from "./pages/PharmacyLM";
import { MarketStrategy } from "./pages/MarketStrategy";
import { SimulationHistory } from "./pages/SimulationHistory";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RootLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ventilator-ai" element={<VentilatorAI />} />
        <Route path="/ot-scheduling" element={<OTScheduling />} />
        <Route path="/predictive-maintenance" element={<PredictiveMaintenance />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/ev-route-optimizer" element={<EVRouteOptimizer />} />
        <Route path="/medicine-traceability" element={<MedicineTraceability />} />
        <Route path="/pharmacy-lm" element={<PharmacyLM />} />
        <Route path="/market-strategy" element={<MarketStrategy />} />
        <Route path="/simulation-history" element={<SimulationHistory />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
