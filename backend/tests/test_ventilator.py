import pytest
from app.schemas.ventilator import VentilatorInput
from app.services.ventilator_fuzzy import run_ventilator_simulation


def test_sample_input_spo2_84_rr_18():
    inp = VentilatorInput(spo2=84, respiration_rate=18)
    result = run_ventilator_simulation(inp)
    assert result.oxygen_flow >= 0
    assert result.oxygen_flow <= 15
    assert len(result.activated_rules) > 0
    assert result.sample_input == {"spo2": 84, "respiration_rate": 18}


def test_critical_spo2_high_flow():
    inp = VentilatorInput(spo2=75, respiration_rate=18)
    result = run_ventilator_simulation(inp)
    assert result.oxygen_flow > 8
    rule_numbers = [r.rule_number for r in result.activated_rules]
    assert 1 in rule_numbers


def test_normal_spo2_normal_rr_low_flow():
    inp = VentilatorInput(spo2=98, respiration_rate=16)
    result = run_ventilator_simulation(inp)
    assert result.oxygen_flow < 5
    rule_numbers = [r.rule_number for r in result.activated_rules]
    assert 3 in rule_numbers


def test_rapid_respiration_high_flow():
    inp = VentilatorInput(spo2=95, respiration_rate=35)
    result = run_ventilator_simulation(inp)
    assert result.oxygen_flow > 8
    rule_numbers = [r.rule_number for r in result.activated_rules]
    assert 1 in rule_numbers


def test_low_spo2_normal_rr_moderate_flow():
    inp = VentilatorInput(spo2=86, respiration_rate=18)
    result = run_ventilator_simulation(inp)
    assert 3 <= result.oxygen_flow <= 11
    rule_numbers = [r.rule_number for r in result.activated_rules]
    assert 2 in rule_numbers


def test_no_rules_activated():
    inp = VentilatorInput(spo2=100, respiration_rate=10)
    result = run_ventilator_simulation(inp)
    assert len(result.activated_rules) == 0
    assert result.oxygen_flow == 0.0


def test_membership_degrees_sum_reasonably():
    inp = VentilatorInput(spo2=84, respiration_rate=18)
    result = run_ventilator_simulation(inp)
    spo2_sum = sum(m.degree for m in result.spo2_memberships)
    rr_sum = sum(m.degree for m in result.respiration_memberships)
    assert spo2_sum > 0
    assert rr_sum > 0
