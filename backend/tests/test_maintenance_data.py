import pytest
from app.services.maintenance_data import (
    generate_equipment_inventory, generate_training_data,
    generate_usage_history, generate_maintenance_records,
)


def test_inventory_count():
    inv = generate_equipment_inventory(count=50)
    assert len(inv) == 50
    assert inv[0]["id"] == 1
    assert inv[-1]["id"] == 50


def test_inventory_reproducibility():
    inv1 = generate_equipment_inventory(count=50, seed=42)
    inv2 = generate_equipment_inventory(count=50, seed=42)
    assert inv1 == inv2


def test_inventory_fields():
    inv = generate_equipment_inventory(count=1)
    eq = inv[0]
    assert "name" in eq
    assert "equipment_type" in eq
    assert "department" in eq
    assert "operating_hours" in eq
    assert "stress_index" in eq


def test_training_data_count():
    X, y = generate_training_data(count=500)
    assert len(X) == 500
    assert len(y) == 500
    assert len(X[0]) == 4


def test_training_data_reproducibility():
    X1, y1 = generate_training_data(count=500, seed=42)
    X2, y2 = generate_training_data(count=500, seed=42)
    assert X1 == X2
    assert y1 == y2


def test_usage_history():
    history = generate_usage_history(1, days=30)
    assert len(history) == 30
    assert "date" in history[0]
    assert "hours_used" in history[0]


def test_maintenance_records():
    records = generate_maintenance_records(1)
    assert len(records) >= 2
    assert "type" in records[0]
    assert "technician" in records[0]
