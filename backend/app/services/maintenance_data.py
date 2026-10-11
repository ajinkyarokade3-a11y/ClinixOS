import random
from datetime import datetime, timedelta


EQUIPMENT_TYPES = [
    "Ventilator", "Infusion Pump", "Patient Monitor",
    "Defibrillator", "Anesthesia Machine", "Surgical Robot",
    "CT Scanner", "MRI Scanner", "Ultrasound", "X-Ray Machine",
]

DEPARTMENTS = [
    "ICU", "OT-1", "OT-2", "OT-3", "Emergency",
    "Radiology", "Cardiology", "General Ward", "Pulmonology", "Neurology",
]


def generate_equipment_inventory(count: int = 50, seed: int = 42) -> list[dict]:
    rng = random.Random(seed)
    inventory = []

    for i in range(1, count + 1):
        eq_type = rng.choice(EQUIPMENT_TYPES)
        dept = rng.choice(DEPARTMENTS)
        hours = round(rng.uniform(500, 9500), 1)
        stress = round(rng.uniform(10, 95), 1)
        temp = round(rng.uniform(20, 85), 1) if rng.random() > 0.2 else None
        vib = round(rng.uniform(0, 30), 1) if rng.random() > 0.2 else None

        inventory.append({
            "id": i,
            "name": f"{eq_type} #{i:03d}",
            "equipment_type": eq_type,
            "department": dept,
            "operating_hours": hours,
            "stress_index": stress,
            "temperature": temp,
            "vibration": vib,
        })

    return inventory


def generate_training_data(count: int = 500, seed: int = 42) -> tuple[list[list[float]], list[float]]:
    rng = random.Random(seed)
    X = []
    y = []

    for _ in range(count):
        hours = rng.uniform(0, 10000)
        stress = rng.uniform(0, 100)
        temp = rng.uniform(20, 90)
        vib = rng.uniform(0, 35)

        base_risk = (
            0.35 * (hours / 10000) * 100 +
            0.35 * stress +
            0.15 * max(0, (temp - 40) / 50) * 100 +
            0.15 * max(0, (vib - 10) / 25) * 100
        )
        noise = rng.gauss(0, 3)
        risk = min(max(base_risk + noise, 0), 100)

        X.append([hours / 10000, stress / 100, temp / 100, vib / 50])
        y.append(risk / 100)

    return X, y


def generate_usage_history(equipment_id: int, days: int = 30, seed: int = 42) -> list[dict]:
    rng = random.Random(seed + equipment_id)
    history = []
    base_date = datetime(2026, 10, 11)

    for d in range(days):
        date = base_date - timedelta(days=d)
        hours_used = round(rng.uniform(2, 24), 1)
        stress = round(rng.uniform(10, 90), 1)
        temp = round(rng.uniform(20, 80), 1)
        vib = round(rng.uniform(0, 25), 1)

        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "hours_used": hours_used,
            "stress_index": stress,
            "temperature": temp,
            "vibration": vib,
        })

    return history


def generate_maintenance_records(equipment_id: int, seed: int = 42) -> list[dict]:
    rng = random.Random(seed + equipment_id * 7)
    records = []
    record_types = ["Routine Inspection", "Calibration", "Part Replacement", "Software Update", "Safety Check"]
    technicians = ["Suresh Menon", "Anita Desai", "Vikram Joshi", "Priya Nair"]

    for i in range(rng.randint(2, 6)):
        date = datetime(2026, 10, 11) - timedelta(days=rng.randint(1, 180))
        records.append({
            "id": i + 1,
            "date": date.strftime("%Y-%m-%d"),
            "type": rng.choice(record_types),
            "technician": rng.choice(technicians),
            "notes": f"Completed {rng.choice(record_types).lower()} procedure.",
            "cost": round(rng.uniform(500, 15000), 2),
        })

    return sorted(records, key=lambda r: r["date"], reverse=True)
