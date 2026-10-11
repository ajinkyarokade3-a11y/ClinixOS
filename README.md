# ClinixOS — Intelligent Hospital Operations Platform

![Python](https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-124_passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

ClinixOS is a full-stack hospital operations platform that brings soft computing
and AI search techniques into everyday clinical workflows — ventilator tuning,
OT scheduling, equipment maintenance, appointments, EV logistics, medicine
traceability, pricing strategy, and dispensary text prediction — unified behind
one responsive operations dashboard.

## ✨ Features

| Module | Capability |
|---|---|
| Overview Dashboard | KPIs, appointment trends, OT risk distribution, equipment tiers, department workload, alerts |
| Ventilator Oxygen Intelligence | Mamdani fuzzy inference (SpO₂ + respiration rate → oxygen flow) with membership charts and rule tracing |
| OT Scheduling & ICU Allocation | Mamdani risk scoring plus Sugeno turnover-buffer model, 75-workflow simulation with reports |
| Predictive Maintenance | Hybrid neuro-fuzzy system (Sugeno fuzzy + neural network), training, evaluation, maintenance queue |
| Smart Appointments | 24-doctor directory, conflict-safe booking, rescheduling, patient queue with waiting-time estimates |
| EV Route Optimizer | A* search with battery and charging-stop planning on a hospital road network |
| Medicine Traceability | BFS downstream tracking, DFS upstream investigation, recall reports on a supply-chain graph |
| Market Strategy | Minimax + alpha-beta duopoly pricing simulator with game-tree visualization |
| Pharmacy Language Models | Bigram and trigram next-word prediction for dispensary text entry |
| Simulation History & Reports | Reproducible simulation runs with distribution charts and filtering |
| Settings & User Management | Role-based users (admin/doctor/nurse/technician/viewer), registration, security overview |

Additional highlights: JWT-style authenticated API with role enforcement,
double-booking prevention under concurrent load, global search, notifications,
CSV-friendly reporting tables, Docker and PostgreSQL support, and health checks.

## 🚀 Quick start

**Backend** — http://localhost:8000 (interactive docs at `/docs`)

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

**Frontend** — http://localhost:5173 (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Seed the database and sign in:

```bash
curl -X POST http://localhost:8000/api/auth/seed
```

| Username | Password | Role |
|---|---|---|
| Ajinkya Rokade | Ajinkya123 | Administrator |
| admin | admin123 | Administrator |
| reception | reception123 | Staff (booking) |
| viewer | viewer123 | Read-only |

## 🛠️ Tech stack

- **Backend:** FastAPI, SQLAlchemy 2, Pydantic, NumPy, scikit-fuzzy
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts
- **Database:** SQLite out of the box, PostgreSQL via `DATABASE_URL`
- **DevOps:** Docker, docker-compose, nginx, pytest

## ⚙️ Configuration

See [.env.example](.env.example). Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./clinixos.db` | PostgreSQL connection string |
| `CLINIXOS_SECRET` | dev default | Token signing key (set a strong value for deployment) |
| `CORS_ORIGINS` | `http://localhost:5173,…` | Allowed browser origins |
| `LOG_LEVEL` | `INFO` | Backend log verbosity |

Check schema status any time:

```bash
cd backend
python -m app.database.migrate --check
```

## 🔌 API overview

| Area | Base path | Highlights |
|---|---|---|
| Auth | `/api/auth` | register, login, me, users, seed |
| Appointments | `/api/appointments` | doctors, patients, book, cancel, reschedule, daily, queue, slots, summary, doctor-stats |
| Ventilator | `/api/ventilator` | simulate, sample |
| OT Scheduling | `/api/ot-scheduling` | mamdani, sugeno, simulate, summary |
| Maintenance | `/api/maintenance` | inventory, equipment detail, predict, queue, history, train, evaluate |
| EV Routing | `/api/ev-routing` | graph, route |
| Traceability | `/api/traceability` | graph, batches, BFS/DFS traversal, recall |
| Market | `/api/market` | simulate, payoff |
| Pharmacy LM | `/api/pharmacy-lm` | corpus, bigram/trigram/compare prediction |
| System | `/health`, `/` | app + database health, module index |

## ✅ Testing

```bash
cd backend
python -m pytest tests/ -v
```

124 tests covering fuzzy inference and defuzzification, neuro-fuzzy math,
A* routing, BFS/DFS traversal, Minimax with pruning equivalence, appointment
scheduling including a concurrent-booking race test, authentication and
authorization, seed consistency, and end-to-end API integration.

```bash
cd ../frontend
npm run typecheck   # strict TypeScript, clean
npm run build       # optimized production bundle
```

## 🐳 Deployment

```bash
cp .env.example .env   # set CLINIXOS_SECRET and POSTGRES_PASSWORD
docker compose up --build
```

This starts PostgreSQL (persisted volume), the FastAPI backend on `:8000`
with container health checks, and the nginx-served frontend on `:80`.

## 📁 Project structure

```
ClinixOS-ai/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (one per module)
│   │   ├── services/     # Fuzzy logic, neural nets, search, scheduling, auth
│   │   ├── models/       # SQLAlchemy entities
│   │   ├── schemas/      # Pydantic request/response contracts
│   │   └── database/     # Engine, sessions, migrations
│   ├── tests/            # 124 pytest tests
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/        # One page per sidebar module
│   │   ├── components/   # Layout + reusable UI kit
│   │   ├── services/     # Typed API clients
│   │   └── data/         # Built-in reference datasets
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── .env.example
```

## 📄 License

MIT — see [LICENSE](LICENSE).
