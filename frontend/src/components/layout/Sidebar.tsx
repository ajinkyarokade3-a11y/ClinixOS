import { NavLink } from "react-router-dom";
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  HeartPulse,
  Languages,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  Stethoscope,
  Wrench,
  X,
} from "lucide-react";
const navItems = [
  { path: "/", label: "Overview Dashboard", icon: LayoutDashboard },
  { path: "/ventilator-ai", label: "Ventilator Oxygen Intelligence", icon: HeartPulse },
  { path: "/ot-scheduling", label: "OT Scheduling & ICU Allocation", icon: Activity },
  { path: "/predictive-maintenance", label: "Biomedical Predictive Maintenance", icon: Wrench },
  { path: "/appointments", label: "Smart Hospital Appointments", icon: Calendar },
  { path: "/ev-route-optimizer", label: "Hospital EV Route Optimizer", icon: MapPin },
  { path: "/medicine-traceability", label: "Medicine Batch Traceability", icon: Package },
  { path: "/pharmacy-lm", label: "Pharmacy Language Models", icon: Languages },
  { path: "/market-strategy", label: "Pharmaceutical Market Strategy", icon: Stethoscope },
  { path: "/simulation-history", label: "Simulation History & Reports", icon: FileText },
  { path: "/settings", label: "Settings & User Management", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={onMobileClose} />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full flex-col bg-navy-900 text-white transition-all duration-300 lg:translate-x-0 ${
          collapsed ? "w-[72px]" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`flex h-16 items-center border-b border-white/10 ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500">
                <Activity size={18} className="text-white" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight">ClinixOS</span>
                <p className="text-[10px] text-slate-400">Intelligent Hospital Operations</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500">
              <Activity size={18} className="text-white" />
            </div>
          )}
          <button onClick={onMobileClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-500/20 text-teal-300"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                } ${collapsed ? "justify-center" : ""}`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={onToggle}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
