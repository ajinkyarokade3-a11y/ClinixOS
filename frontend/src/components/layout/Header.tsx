import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi, getToken, setToken } from "../../services/clinicApi";

const pageTitles: Record<string, { title: string; breadcrumb: string }> = {
  "/": { title: "Overview Dashboard", breadcrumb: "Dashboard" },
  "/ventilator-ai": { title: "Ventilator Oxygen Intelligence", breadcrumb: "AI Modules" },
  "/ot-scheduling": { title: "OT Scheduling & ICU Allocation", breadcrumb: "Operations" },
  "/predictive-maintenance": { title: "Biomedical Predictive Maintenance", breadcrumb: "Operations" },
  "/appointments": { title: "Smart Hospital Appointments", breadcrumb: "Operations" },
  "/ev-route-optimizer": { title: "Hospital EV Route Optimizer", breadcrumb: "Logistics" },
  "/medicine-traceability": { title: "Medicine Batch Traceability", breadcrumb: "Pharmacy" },
  "/pharmacy-lm": { title: "Pharmacy Language Models", breadcrumb: "Pharmacy" },
  "/market-strategy": { title: "Pharmaceutical Market Strategy", breadcrumb: "Analytics" },
  "/simulation-history": { title: "Simulation History & Reports", breadcrumb: "Analytics" },
  "/settings": { title: "Settings & User Management", breadcrumb: "System" },
};

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

const searchablePages = [
  { path: "/", label: "Overview Dashboard", keywords: "dashboard overview home kpi stats" },
  { path: "/ventilator-ai", label: "Ventilator Oxygen Intelligence", keywords: "ventilator oxygen spo2 fuzzy flow" },
  { path: "/ot-scheduling", label: "OT Scheduling & ICU Allocation", keywords: "ot surgery scheduling icu mamdani sugeno risk" },
  { path: "/predictive-maintenance", label: "Biomedical Predictive Maintenance", keywords: "maintenance equipment failure neuro fuzzy ventilator pump monitor" },
  { path: "/appointments", label: "Smart Hospital Appointments", keywords: "appointment booking doctor patient queue schedule calendar" },
  { path: "/ev-route-optimizer", label: "Hospital EV Route Optimizer", keywords: "ev route vehicle battery charging astar map" },
  { path: "/medicine-traceability", label: "Medicine Batch Traceability", keywords: "medicine batch trace recall bfs dfs supply pharmacy" },
  { path: "/pharmacy-lm", label: "Pharmacy Language Models", keywords: "pharmacy language bigram trigram predict text dosage" },
  { path: "/market-strategy", label: "Pharmaceutical Market Strategy", keywords: "market price minimax strategy revenue profit" },
  { path: "/simulation-history", label: "Simulation History & Reports", keywords: "simulation history report runs" },
  { path: "/settings", label: "Settings & User Management", keywords: "settings users admin roles" },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const page = pageTitles[location.pathname] || { title: "ClinixOS", breadcrumb: "Dashboard" };

  useEffect(() => {
    if (getToken()) {
      authApi.me().then((u) => setCurrentUser({ username: u.username, role: u.role })).catch(() => setCurrentUser(null));
    } else {
      setCurrentUser(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matches = query.trim()
    ? searchablePages.filter((p) => `${p.label} ${p.keywords}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  const signOut = () => {
    setToken(null);
    setCurrentUser(null);
    setShowUserMenu(false);
    navigate("/login");
  };

  const notifications = [
    { id: 1, text: "Defibrillator EQ-005 health critical", time: "10m ago", severity: "critical" as const },
    { id: 2, text: "OT-3 scheduling conflict detected", time: "32m ago", severity: "warning" as const },
    { id: 3, text: "Low stock alert: Amoxicillin 500mg", time: "1h ago", severity: "warning" as const },
    { id: 4, text: "Simulation SIM-047 completed", time: "4h ago", severity: "info" as const },
  ];

  return (
    <header
      className={`fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-surface-border bg-white/80 px-4 backdrop-blur-md transition-all duration-300 lg:px-6 ${
        sidebarCollapsed ? "left-[72px]" : "left-0 lg:left-64"
      }`}
    >
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
          <Menu size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>ClinixOS</span>
            <span>/</span>
            <span>{page.breadcrumb}</span>
          </div>
          <h2 className="text-sm font-semibold text-slate-800">{page.title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block" ref={searchRef}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search pages..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches.length > 0) {
                navigate(matches[0].path);
                setQuery("");
                setSearchOpen(false);
              }
              if (e.key === "Escape") {
                setQuery("");
                setSearchOpen(false);
              }
            }}
            className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
          {searchOpen && query.trim() && (
            <div className="absolute left-0 top-11 w-72 overflow-hidden rounded-xl border border-surface-border bg-white shadow-lg">
              {matches.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400">No pages match “{query.trim()}”.</p>
              ) : (
                matches.map((m) => (
                  <button
                    key={m.path}
                    onClick={() => {
                      navigate(m.path);
                      setQuery("");
                      setSearchOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {m.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <Bell size={18} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 rounded-xl border border-surface-border bg-white shadow-lg">
              <div className="border-b border-surface-border px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 border-b border-surface-border/50 px-4 py-3 hover:bg-slate-50">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.severity === "critical" ? "bg-rose-500" : n.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm text-slate-700">{n.text}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
              {currentUser ? initials(currentUser.username) : "?"}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-slate-700">{currentUser ? currentUser.username : "Guest"}</p>
              <p className="text-xs capitalize text-slate-400">{currentUser ? currentUser.role : "Not signed in"}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-12 w-48 rounded-xl border border-surface-border bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  navigate("/settings");
                  setShowUserMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  navigate("/settings");
                  setShowUserMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Settings
              </button>
              <hr className="my-1 border-surface-border" />
              <button onClick={signOut} className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
