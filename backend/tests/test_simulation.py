import pytest
from app.services.simulation import generate_workflows, summarize_workflows


def test_generate_75_workflows():
    workflows = generate_workflows(count=75)
    assert len(workflows) == 75
    assert workflows[0].id == 1
    assert workflows[-1].id == 75


def test_reproducibility():
    wf1 = generate_workflows(count=75, seed=42)
    wf2 = generate_workflows(count=75, seed=42)
    assert [w.mamdani_risk for w in wf1] == [w.mamdani_risk for w in wf2]


def test_summary():
    workflows = generate_workflows(count=75)
    summary = summarize_workflows(workflows)
    assert summary.total_workflows == 75
    assert sum(summary.action_breakdown.values()) == 75
    assert sum(summary.risk_distribution.values()) == 75
    assert summary.avg_risk_score > 0
    assert summary.avg_buffer_extension >= 0


def test_workflow_ranges():
    workflows = generate_workflows(count=75)
    for w in workflows:
        assert 1 <= w.surgical_urgency <= 10
        assert 0 <= w.surgeon_workload <= 100
        assert 0 <= w.icu_capacity <= 100
        assert w.mamdani_risk >= 0
        assert w.sugeno_buffer >= 0
