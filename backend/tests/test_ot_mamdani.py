import pytest
from app.schemas.ot_scheduling import OTSchedulingInput
from app.services.ot_mamdani import run_mamdani


def test_emergency_critical_icu():
    inp = OTSchedulingInput(surgical_urgency=9, surgeon_workload=50, icu_capacity=10)
    result = run_mamdani(inp)
    assert result.risk_score > 6
    assert result.scheduling_action == "Emergency Override"
    rule_numbers = [r.rule_number for r in result.activated_rules]
    assert 1 in rule_numbers


def test_elective_high_workload():
    inp = OTSchedulingInput(surgical_urgency=2, surgeon_workload=85, icu_capacity=70)
    result = run_mamdani(inp)
    assert result.scheduling_action == "Reschedule Elective"
    rule_numbers = [r.rule_number for r in result.activated_rules]
    assert 2 in rule_numbers


def test_elective_sufficient_icu_proceed():
    inp = OTSchedulingInput(surgical_urgency=2, surgeon_workload=30, icu_capacity=80)
    result = run_mamdani(inp)
    assert result.scheduling_action == "Proceed as Scheduled"
    rule_numbers = [r.rule_number for r in result.activated_rules]
    assert 5 in rule_numbers


def test_risk_score_range():
    inp = OTSchedulingInput(surgical_urgency=5, surgeon_workload=50, icu_capacity=50)
    result = run_mamdani(inp)
    assert 1 <= result.risk_score <= 10


def test_no_rules_activated():
    inp = OTSchedulingInput(surgical_urgency=5.0, surgeon_workload=50, icu_capacity=50)
    result = run_mamdani(inp)
    if len(result.activated_rules) == 0:
        assert result.risk_score == 0.0
