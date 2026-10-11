import { Activity, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ApiError } from "../services/api";
import { authApi, setToken } from "../services/clinicApi";

export function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState(() => localStorage.getItem("clinixos_remembered") || "reception");
  const [password, setPassword] = useState("reception123");
  const [remember, setRemember] = useState(() => localStorage.getItem("clinixos_remembered") !== null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await authApi.login(username, password);
      setToken(r.access_token);
      if (remember) localStorage.setItem("clinixos_remembered", username);
      else localStorage.removeItem("clinixos_remembered");
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed. Is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-navy-900 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500">
            <Activity size={22} className="text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white">ClinixOS</span>
            <p className="text-xs text-slate-400">Intelligent Hospital Operations Platform</p>
          </div>
        </div>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold leading-tight text-white">
            Smart hospital operations,
            <br />
            <span className="text-teal-400">powered by intelligent algorithms.</span>
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            ClinixOS integrates fuzzy logic, neuro-fuzzy systems, A* routing, and minimax optimization
            to streamline hospital operations — from ventilator management to OT scheduling.
          </p>
          <div className="flex gap-8">
            <div>
              <p className="text-2xl font-bold text-teal-400">7+</p>
              <p className="text-xs text-slate-400">AI Modules</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-400">24/7</p>
              <p className="text-xs text-slate-400">Monitoring</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-400">Real-time</p>
              <p className="text-xs text-slate-400">Analytics</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500">Secure sign-in with role-based access. Sessions expire after 8 hours.</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500">
              <Activity size={22} className="text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-800">ClinixOS</span>
              <p className="text-xs text-slate-500">Intelligent Hospital Operations Platform</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your ClinixOS account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username"
              type="text"
              placeholder="reception"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => setNotice("Password resets are handled by your administrator. Ask Ajinkya Rokade (admin) to reset it via user management.")}
                className="text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Forgot password?
              </button>
            </div>
            {notice && (
              <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{notice}</p>
            )}
            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in..." : "Sign In"}
              <ArrowRight size={16} />
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400">
            Accounts: reception / reception123 · admin / admin123 · viewer / viewer123. JWT-style
            HMAC tokens, PBKDF2 password hashes. Set CLINIXOS_SECRET in production.
          </p>
        </div>
      </div>
    </div>
  );
}
