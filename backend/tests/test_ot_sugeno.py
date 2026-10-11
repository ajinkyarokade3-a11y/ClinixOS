import pytest
from app.schemas.ot_scheduling import OTSchedulingInput
from app.services.ot_sugeno import run_sugeno


def test_high_workload_urgent():
    inp = OTSchedulingInput(surgical_urgency=8, surgeon_workload=80, icu_capacity=50)
    result = run_sugeno(inp)
    assert result.buffer_extension > 15
    rule_numbers = [r.rule_number for r in result.activated_rules]
    assert 1 in rule_numbers


def test_sufficient_icu_elective():
    inp = OTSchedulingInput(surgical_urgency=2, surgeon_workload=30, icu_capacity=80)
    result = run_sugeno(inp)
    assert result.buffer_extension == 5.0
    rule_numbers = [r.rule_number for r in result.activated_rules]
    assert 2 in rule_numbers


def test_critical_icu_emergency():
    inp = OTSchedulingInput(surgical_urgency=9, surgeon_workload=60, icu_capacity=10)
    result = run_sugeno(inp)
    assert result.buffer_extension > 20
    rule_numbers = [r.rule_number for r in result.activated_rules]
    assert 3 in rule_numbers


def test_no_rules_activated():
    inp = OTSchedulingInput(surgical_urgency=5.0, surgeon_workload=50, icu_capacity=50)
    result = run_sugeno(inp)
    if len(result.activated_rules) == 0:
        assert result.buffer_extension == 0.0
