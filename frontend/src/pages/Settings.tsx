import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { AlertTriangle, Database, Shield, UserPlus, Users } from "lucide-react";
import { ApiError } from "../services/api";
import { authApi, getToken } from "../services/clinicApi";

const roleVariant: Record<string, "purple" | "info" | "warning" | "neutral" | "success"> = {
  admin: "purple",
  doctor: "info",
  nurse: "success",
  technician: "warning",
  viewer: "neutral",
};

interface UserRow {
  username: string;
  role: string;
  display_name: string;
}

export function Settings() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "viewer", display_name: "" });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await authApi.users();
      setUsers(list);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError("Sign in required. Use the Login page or the Appointments sign-in first.");
      } else if (e instanceof ApiError && e.status === 403) {
        setError("Admin role required to view users. Sign in as admin / admin123.");
      } else {
        setError(e instanceof ApiError ? e.message : "Failed to load users. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getToken()) load();
    else {
      setLoading(false);
      setError("Sign in required. Use the Login page or the Appointments sign-in first.");
    }
  }, []);

  const register = async () => {
    setError(null);
    setNotice(null);
    try {
      await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new ApiError(body.detail || "Registration failed", res.status);
        }
        return res.json();
      });
      setNotice(`User "${newUser.username}" registered.`);
      setNewUser({ username: "", password: "", role: "viewer", display_name: "" });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Registration failed.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & User Management"
        subtitle="User records. Self-registration as admin is blocked."
        actions={<Button variant="secondary" onClick={load}>Refresh</Button>}
      />

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
      {notice && (
        <Card>
          <CardBody>
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="User Management" subtitle={`${users.length} registered users`} />
            <CardBody className="p-0">
              {loading ? (
                <LoadingSpinner />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-border">
                        <th className="table-header">Username</th>
                        <th className="table-header">Display Name</th>
                        <th className="table-header">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.username} className="border-b border-surface-border/50 hover:bg-slate-50/50">
                          <td className="table-cell font-mono text-xs font-medium">{u.username}</td>
                          <td className="table-cell">{u.display_name}</td>
                          <td className="table-cell">
                            <Badge variant={roleVariant[u.role] ?? "neutral"}>{u.role}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Register User" subtitle="Admin-gated roles are enforced by the server (admin self-registration returns 403)" />
            <CardBody>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input label="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
                <Input label="Password (min 6 chars)" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                <Input label="Display name" value={newUser.display_name} onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })} />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Role</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="input-field">
                    <option value="viewer">viewer</option>
                    <option value="technician">technician</option>
                    <option value="nurse">nurse</option>
                    <option value="doctor">doctor</option>
                    <option value="admin">admin (blocked)</option>
                  </select>
                </div>
              </div>
              <Button onClick={register} className="mt-4" icon={<UserPlus size={16} />}>Register User</Button>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Security Status" subtitle="Enforced authentication & authorization" />
            <CardBody>
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <Shield size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Authentication Active</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    PBKDF2 password hashes, HMAC-signed tokens (8h expiry), role-based access on booking,
                    patient and admin endpoints. A default secret is used unless CLINIXOS_SECRET is set — required
                    for any production deployment.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Database" subtitle="Persistence layer" />
            <CardBody>
              <div className="flex items-start gap-3 rounded-lg border border-surface-border p-4">
                <Database size={18} className="mt-0.5 shrink-0 text-slate-500" />
                <p className="text-sm text-slate-600">
                  SQLite by default (<span className="font-mono text-xs">clinixos.db</span>), PostgreSQL via the
                  DATABASE_URL environment variable. Schema check: <span className="font-mono text-xs">python -m app.database.migrate --check</span>.
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="User Roles" subtitle="Server-enforced role types" />
            <CardBody>
              <div className="space-y-2">
                {[
                  { role: "Admin", desc: "User list, full system access", icon: Shield },
                  { role: "Doctor", desc: "Booking, patients, schedules", icon: Users },
                  { role: "Nurse", desc: "Booking, patients, ward care", icon: Users },
                  { role: "Technician", desc: "Equipment views", icon: Users },
                  { role: "Viewer", desc: "Read-only, no patient lists", icon: Users },
                ].map((r) => (
                  <div key={r.role} className="flex items-center justify-between rounded-lg border border-surface-border p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.role}</p>
                      <p className="text-xs text-slate-500">{r.desc}</p>
                    </div>
                    <Badge variant={roleVariant[r.role.toLowerCase()] ?? "neutral"}>{r.role}</Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
