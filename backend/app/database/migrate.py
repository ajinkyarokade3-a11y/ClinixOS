"""Lightweight migration helper.

The schema is managed with SQLAlchemy ``create_all`` (no Alembic in this
codebase). This module records which table set a database file was created
with so operators can detect a stale schema after upgrades.

Usage:
    python -m app.database.migrate          # stamp / verify ./clinixos.db
    python -m app.database.migrate --check  # exit 1 if schema is stale
"""
import argparse
import sys
from sqlalchemy import inspect, text
from app.database.db import Base, engine, init_db

MIGRATION_VERSION = "2026-10-11-phase6"


def current_tables() -> list[str]:
    inspector = inspect(engine)
    return sorted(inspector.get_table_names())


def expected_tables() -> list[str]:
    return sorted(Base.metadata.tables.keys())


def stamp() -> dict:
    tables = init_db()
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS schema_version (version TEXT PRIMARY KEY)"))
        conn.execute(text("DELETE FROM schema_version"))
        conn.execute(text("INSERT INTO schema_version (version) VALUES (:v)"), {"v": MIGRATION_VERSION})
    return {"version": MIGRATION_VERSION, "tables": tables}


def check() -> dict:
    expected = set(expected_tables())
    actual = set(current_tables()) - {"schema_version"}
    missing = sorted(expected - actual)
    return {"version": MIGRATION_VERSION, "stale": bool(missing), "missing_tables": missing}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        result = check()
        print(result)
        return 1 if result["stale"] else 0
    print(stamp())
    return 0


if __name__ == "__main__":
    sys.exit(main())
