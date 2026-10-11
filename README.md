# ClinixOS-ai — Intelligent Hospital Operations Platform

Browser-based full-stack web application (React + TypeScript + Vite + Tailwind frontend,
FastAPI + SQLAlchemy backend). Hospital operations data shown here is for demonstration —
never connected to real ventilators, never clinically validated, never real market research.

## Modules (all wired to live backend endpoints)

| Page | Backend |
|---|---|
| Overview Dashboard | Aggregates appointments, maintenance, OT simulation, pharmacy endpoints |
| Ventilator Oxygen Intelligence | Mamdani fuzzy inference, centroid defuzzification (`/api/ventilator`) |
| OT Scheduling & ICU Allocation | Mamdani risk + Sugeno buffer, 75-workflow simulation (`/api/ot-scheduling`) |
| Biomedical Predictive Maintenance | Hybrid neuro-fuzzy (Sugeno + NumPy MLP), training/evaluation (`/api/maintenance`) |
| Smart Hospital Appointments | SQLAlchemy persistence, conflict-safe booking, queue (`/api/appointments`) |
| Hospital EV Route Optimizer | A* search with battery/charging model (`/api/ev-routing`) |
| Medicine Batch Traceability | BFS downstream + DFS upstream on supply-chain graph (`/api/traceability`) |
| Pharmaceutical Market Strategy | Minimax + alpha-beta duopoly simulator (`/api/market`) |
| Pharmacy Language Models | Bigram µLM + trigram SLM next-word prediction (`/api/pharmacy-lm`) |
| Simulation History & Reports | Live OT simulation runs and summaries |
| Settings & User Management | Live user records, registration, role matrix |

## Quick start (development)

```bash
# Backend (http://localhost:8000, docs at /docs)
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Frontend (http://localhost:5173) — separate terminal
cd frontend
npm install
npm run dev
```

Seed demo data, then sign in (Login page or Appointments page):

```bash
curl -X POST http://localhost:8000/api/auth/seed
# reception / reception123 · admin / admin123 · viewer / viewer123
```

## Configuration (.env — see .env.example)

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./clinixos.db` | PostgreSQL via `postgresql+psycopg2://…` |
| `CLINIXOS_SECRET` | insecure dev default (warns in logs) | **Required in production** — token signing |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins |
| `LOG_LEVEL` | `INFO` | Backend log verbosity |

## Database & migrations

- SQLite by default; data persists in `backend/clinixos.db`.
- PostgreSQL: set `DATABASE_URL` (driver `psycopg2-binary` is in requirements).
- Schema is managed with `create_all` on startup. Verify/stamp with:

```bash
cd backend
python -m app.database.migrate --check   # exit 1 if tables are missing
python -m app.database.migrate           # create + stamp schema version
```

## Tests (actually executed)

```bash
cd backend
python -m pytest tests/ -v     # 118 tests: fuzzy, defuzzification, HNFS, A*,
                               # BFS/DFS, minimax, appointments, auth, API
                               # integration incl. concurrent-booking race test
cd ../frontend
npm run typecheck               # tsc --noEmit, clean
npm run build                   # production build
```

## Deployment (Docker)

```bash
cp .env.example .env   # then set CLINIXOS_SECRET and POSTGRES_PASSWORD
docker compose up --build
# frontend :80 · backend :8000 · postgres with pgdata volume
```

Health checks: backend `GET /health` reports app + database status (used as the
container HEALTHCHECK); frontend serves `/health`. Structured startup logging
via `LOG_LEVEL`.

## Security model (audited)

- Passwords: PBKDF2-HMAC-SHA256 (200k iterations) with per-user salt; no plaintext storage.
- Tokens: HMAC-SHA256 signed, 8h expiry, verified on every protected request.
- Authorization: `require_roles` dependency on booking, patient, and admin endpoints;
  admin self-registration blocked (403); patient lists require sign-in.
- Validation: server-side Pydantic bounds on all inputs; 409 on schedule conflicts,
  404 on missing records, 422 on out-of-range fuzzy inputs.
- Privacy: all patient/equipment/pharmacy data is synthetic demo data.

## Honest limitations

- Tested on SQLite; PostgreSQL wiring is provided (compose + driver) but not
  executed against a live Postgres here.
- Auth tokens are self-contained HMAC tokens (no revocation list); demo
  credentials ship for evaluation and must be rotated/disabled in production.
- All model outputs (oxygen flow, risk scores, routes, prices, word predictions)
  are unvalidated estimates — not medical, operational, or
  financial advice.
- Frontend bundle is large (~730 KB JS, mostly recharts); code-splitting is future work.
