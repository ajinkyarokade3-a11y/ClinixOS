import random
from app.schemas.ot_scheduling import OTSchedulingInput, SurgicalWorkflow, SimulationSummary
from app.services.ot_mamdani import run_mamdani
from app.services.ot_sugeno import run_sugeno


def generate_workflows(count: int = 75, seed: int = 42) -> list[SurgicalWorkflow]:
    rng = random.Random(seed)
    workflows = []

    for i in range(1, count + 1):
        urgency = round(rng.uniform(1, 10), 1)
        workload = round(rng.uniform(0, 100), 1)
        icu = round(rng.uniform(0, 100), 1)

        inp = OTSchedulingInput(
            surgical_urgency=urgency,
            surgeon_workload=workload,
            icu_capacity=icu,
        )

        mamdani = run_mamdani(inp)
        sugeno = run_sugeno(inp)

        workflows.append(SurgicalWorkflow(
            id=i,
            surgical_urgency=urgency,
            surgeon_workload=workload,
            icu_capacity=icu,
            mamdani_risk=mamdani.risk_score,
            mamdani_action=mamdani.scheduling_action,
            sugeno_buffer=sugeno.buffer_extension,
        ))

    return workflows


def summarize_workflows(workflows: list[SurgicalWorkflow]) -> SimulationSummary:
    total = len(workflows)

    action_breakdown: dict[str, int] = {}
    for w in workflows:
        action_breakdown[w.mamdani_action] = action_breakdown.get(w.mamdani_action, 0) + 1

    risk_distribution: dict[str, int] = {"low": 0, "moderate": 0, "high": 0}
    for w in workflows:
        if w.mamdani_risk < 3.5:
            risk_distribution["low"] += 1
        elif w.mamdani_risk < 7:
            risk_distribution["moderate"] += 1
        else:
            risk_distribution["high"] += 1

    avg_buffer = sum(w.sugeno_buffer for w in workflows) / total if total > 0 else 0
    avg_risk = sum(w.mamdani_risk for w in workflows) / total if total > 0 else 0

    return SimulationSummary(
        total_workflows=total,
        action_breakdown=action_breakdown,
        risk_distribution=risk_distribution,
        avg_buffer_extension=round(avg_buffer, 2),
        avg_risk_score=round(avg_risk, 2),
    )
