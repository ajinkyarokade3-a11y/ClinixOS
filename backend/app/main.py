import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api.ventilator import router as ventilator_router
from app.api.ot_scheduling import router as ot_scheduling_router
from app.api.maintenance import router as maintenance_router
from app.api.ev_routing import router as ev_routing_router
from app.api.medicine_traceability import router as traceability_router
from app.api.auth import router as auth_router
from app.api.appointments import router as appointments_router
from app.api.market import router as market_router
from app.api.pharmacy_lm import router as pharmacy_lm_router
from app.database.db import init_db, engine

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("clinixos")

if not os.environ.get("CLINIXOS_SECRET"):
    logger.warning("CLINIXOS_SECRET is not set; using insecure dev default. Set it in production.")

app = FastAPI(
    title="ClinixOS-ai",
    description="Intelligent Hospital Operations Platform — API",
    version="2.0.0",
)

allowed_origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ventilator_router)
app.include_router(ot_scheduling_router)
app.include_router(maintenance_router)
app.include_router(ev_routing_router)
app.include_router(traceability_router)
app.include_router(auth_router)
app.include_router(appointments_router)
app.include_router(market_router)
app.include_router(pharmacy_lm_router)

init_db()
logger.info("Database tables ensured.")


@app.get("/")
def root():
    return {"message": "ClinixOS-ai API v2", "modules": ["ventilator-ai", "ot-scheduling", "predictive-maintenance", "ev-routing", "medicine-traceability", "appointments", "market-strategy", "auth", "pharmacy-lm"]}


@app.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "up"
    except Exception as e:
        logger.error("Database health check failed: %s", e)
        db_status = "down"
    return {"status": "healthy" if db_status == "up" else "degraded", "database": db_status}
