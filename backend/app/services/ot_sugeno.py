import numpy as np
import skfuzzy as fuzz
from app.schemas.ot_scheduling import OTSchedulingInput, SugenoOutput, SugenoRule


def run_sugeno(data: OTSchedulingInput) -> SugenoOutput:
    urgency = data.surgical_urgency
    workload = data.surgeon_workload
    icu = data.icu_capacity

    x_urgency = np.arange(1, 11.1, 0.1)
    x_workload = np.arange(0, 101, 1)
    x_icu = np.arange(0, 101, 1)

    urgency_elective = fuzz.trimf(x_urgency, [1, 1, 4])
    urgency_urgent = fuzz.trimf(x_urgency, [3, 6.5, 10])
    urgency_emergency = fuzz.trimf(x_urgency, [7, 10, 10])

    workload_low = fuzz.trimf(x_workload, [0, 0, 40])
    workload_moderate = fuzz.trimf(x_workload, [30, 55, 80])
    workload_high = fuzz.trimf(x_workload, [60, 100, 100])

    icu_critical = fuzz.trimf(x_icu, [0, 0, 30])
    icu_limited = fuzz.trimf(x_icu, [20, 50, 80])
    icu_sufficient = fuzz.trimf(x_icu, [60, 100, 100])

    u_elective = fuzz.interp_membership(x_urgency, urgency_elective, urgency)
    u_urgent = fuzz.interp_membership(x_urgency, urgency_urgent, urgency)
    u_emergency = fuzz.interp_membership(x_urgency, urgency_emergency, urgency)

    w_low = fuzz.interp_membership(x_workload, workload_low, workload)
    w_moderate = fuzz.interp_membership(x_workload, workload_moderate, workload)
    w_high = fuzz.interp_membership(x_workload, workload_high, workload)

    i_critical = fuzz.interp_membership(x_icu, icu_critical, icu)
    i_limited = fuzz.interp_membership(x_icu, icu_limited, icu)
    i_sufficient = fuzz.interp_membership(x_icu, icu_sufficient, icu)

    rule1_deg = max(w_high, u_urgent)
    rule1_output = 0.5 * workload + 15

    rule2_deg = min(i_sufficient, u_elective)
    rule2_output = 5.0

    rule3_deg = min(i_critical, u_emergency)
    rule3_output = 0.3 * workload + 25

    activated_rules = []
    if rule1_deg > 0:
        activated_rules.append(SugenoRule(
            rule_number=1,
            description="High workload AND urgent surgery -> 0.5 * workload + 15",
            antecedent_degree=round(rule1_deg, 4),
            output_value=round(rule1_output, 2),
            weight=round(rule1_deg, 4),
        ))
    if rule2_deg > 0:
        activated_rules.append(SugenoRule(
            rule_number=2,
            description="Sufficient ICU capacity AND elective surgery -> 5 minutes",
            antecedent_degree=round(rule2_deg, 4),
            output_value=round(rule2_output, 2),
            weight=round(rule2_deg, 4),
        ))
    if rule3_deg > 0:
        activated_rules.append(SugenoRule(
            rule_number=3,
            description="Critical ICU AND emergency -> 0.3 * workload + 25",
            antecedent_degree=round(rule3_deg, 4),
            output_value=round(rule3_output, 2),
            weight=round(rule3_deg, 4),
        ))

    if not activated_rules:
        return SugenoOutput(
            buffer_extension=0.0,
            activated_rules=[],
        )

    numerator = sum(r.antecedent_degree * r.output_value for r in activated_rules)
    denominator = sum(r.antecedent_degree for r in activated_rules)

    buffer_extension = numerator / denominator if denominator > 0 else 0.0

    return SugenoOutput(
        buffer_extension=round(buffer_extension, 2),
        activated_rules=activated_rules,
    )
