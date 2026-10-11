import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./clinixos.db")
CONNECT_ARGS = {"check_same_thread": False, "timeout": 30} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=CONNECT_ARGS)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import entities  # noqa: F401  (register tables)
    Base.metadata.create_all(bind=engine)
    ensure_columns()
    return sorted(Base.metadata.tables.keys())


def ensure_columns():
    """Add columns introduced after the initial schema to existing databases.

    Runs on every startup; ALTER TABLE is issued only for missing columns,
    so it is idempotent on both SQLite and PostgreSQL.
    """
    from sqlalchemy import inspect, text

    wanted: dict[str, list[tuple[str, str]]] = {
        "doctors": [("experience_years", "INTEGER DEFAULT 0"), ("room_number", "VARCHAR(16) DEFAULT ''")],
        "appointments": [("appointment_type", "VARCHAR(32) DEFAULT 'Consultation'"), ("priority", "VARCHAR(16) DEFAULT 'Routine'")],
    }
    with engine.begin() as conn:
        existing_tables = set(inspect(conn).get_table_names())
        for table, cols in wanted.items():
            if table not in existing_tables:
                continue
            existing = {c["name"] for c in inspect(conn).get_columns(table)}
            for name, ddl in cols:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
