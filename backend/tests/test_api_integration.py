"""API integration tests against the real FastAPI app + file database.

Covers health checks, auth/RBAC, appointment conflicts, invalid inputs,
missing records, graph edge cases and concurrent bookings. Created
appointments are cancelled afterwards to leave the dev database clean.
"""
import threading
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
SLOT = "2027-01-11T10:00:00"  # a Monday
_created: list[int] = []


def staff_headers() -> dict:
    client.post("/api/auth/seed")
    r = client.post("/api/auth/login", json={"username": "reception", "password": "reception123"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def viewer_headers() -> dict:
    r = client.post("/api/auth/login", json={"username": "viewer", "password": "viewer123"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def teardown_module():
    h = staff_headers()
    for appt_id in _created:
        client.post(f"/api/appointments/{appt_id}/cancel", headers=h)


def test_health_db_up():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["database"] == "up"


def test_seed_login_me():
    assert client.post("/api/auth/seed").status_code == 200
    h = staff_headers()
    me = client.get("/api/auth/me", headers=h)
    assert me.status_code == 200
    assert me.json()["role"] == "nurse"


def test_unauthenticated_patients_denied():
    r = client.get("/api/appointments/patients")
    assert r.status_code in (401, 403)


def test_viewer_cannot_book():
    h = viewer_headers()
    r = client.post("/api/appointments/book", headers=h, json={
        "patient_id": 1, "doctor_id": 1, "start_time": SLOT,
        "duration_minutes": 30, "reason": "rbac-test",
    })
    assert r.status_code == 403


def test_book_and_double_book_conflict():
    h = staff_headers()
    r1 = client.post("/api/appointments/book", headers=h, json={
        "patient_id": 1, "doctor_id": 1, "start_time": SLOT,
        "duration_minutes": 30, "reason": "integration-test",
    })
    assert r1.status_code == 200, r1.text
    _created.append(r1.json()["id"])
    r2 = client.post("/api/appointments/book", headers=h, json={
        "patient_id": 2, "doctor_id": 1, "start_time": "2027-01-11T10:15:00",
        "duration_minutes": 30, "reason": "integration-test",
    })
    assert r2.status_code == 409


def test_reschedule_conflict_detected():
    h = staff_headers()
    a = client.post("/api/appointments/book", headers=h, json={
        "patient_id": 1, "doctor_id": 2, "start_time": "2027-01-11T10:00:00",
        "duration_minutes": 30, "reason": "integration-test",
    }).json()
    _created.append(a["id"])
    b = client.post("/api/appointments/book", headers=h, json={
        "patient_id": 2, "doctor_id": 2, "start_time": "2027-01-11T11:00:00",
        "duration_minutes": 30, "reason": "integration-test",
    }).json()
    _created.append(b["id"])
    r = client.post(f"/api/appointments/{a['id']}/reschedule", headers=h,
                    json={"new_start_time": "2027-01-11T11:15:00"})
    assert r.status_code == 409


def test_missing_appointment_404():
    h = staff_headers()
    r = client.post("/api/appointments/999999/cancel", headers=h)
    assert r.status_code == 404


def test_invalid_status_filter_400():
    h = staff_headers()
    r = client.get("/api/appointments/history?status=bogus", headers=h)
    assert r.status_code == 400


def test_invalid_ventilator_input_422():
    r = client.post("/api/ventilator/simulate", json={"spo2": 50, "respiration_rate": 18})
    assert r.status_code == 422


def test_missing_batch_404():
    r = client.get("/api/traceability/batches/NOPE-000")
    assert r.status_code == 404


def test_invalid_trace_node_404():
    r = client.post("/api/traceability/traverse/bfs?start_node=NOPE")
    assert r.status_code == 404


def test_ev_invalid_destination_unreachable():
    r = client.post("/api/ev-routing/route", json={
        "start_node": "depot", "end_node": "atlantis",
        "battery_capacity": 60, "current_charge": 50,
    })
    assert r.status_code == 200
    assert r.json()["reachable"] is False


def test_ot_simulate_count_bounds():
    r = client.post("/api/ot-scheduling/simulate?count=0")
    assert r.status_code == 400


def test_empty_summary_ok():
    h = staff_headers()
    r = client.get("/api/appointments/summary?date=2030-01-01T00:00:00", headers=h)
    assert r.status_code == 200
    assert r.json()["total"] == 0


def test_concurrent_bookings_single_winner():
    h = staff_headers()
    # Discover a free 30-min slot dynamically so reruns never collide with leftovers.
    slots = client.get("/api/appointments/slots?doctor_id=1&date=2027-01-11T00:00:00&duration_minutes=30", headers=h).json()
    assert slots, "no free slots available for race test"
    slot = slots[-1]["start"]
    results: list[int] = []

    def attempt():
        try:
            c = TestClient(app)
            r = c.post("/api/appointments/book", headers=h, json={
                "patient_id": 1, "doctor_id": 1, "start_time": slot,
                "duration_minutes": 30, "reason": "race-test",
            })
            results.append(r.status_code)
        except Exception as e:
            results.append(f"ERR:{type(e).__name__}")

    try:
        threads = [threading.Thread(target=attempt) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert sorted(results) == [200, 409]
        daily = client.get("/api/appointments/daily?doctor_id=1&date=2027-01-11T00:00:00", headers=h).json()
        winners = [a for a in daily if a["start_time"] == slot and a["status"] in ("scheduled", "confirmed")]
        assert len(winners) == 1
    finally:
        daily = client.get("/api/appointments/daily?doctor_id=1&date=2027-01-11T00:00:00", headers=h).json()
        for a in daily:
            if a["start_time"] == slot and a["status"] in ("scheduled", "confirmed"):
                client.post(f"/api/appointments/{a['id']}/cancel", headers=h)


def test_admin_users_requires_admin():
    h = viewer_headers()
    r = client.get("/api/auth/users", headers=h)
    assert r.status_code == 403


def test_admin_can_list_users():
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    users = client.get("/api/auth/users", headers=h)
    assert users.status_code == 200
    assert any(u["username"] == "admin" for u in users.json())
