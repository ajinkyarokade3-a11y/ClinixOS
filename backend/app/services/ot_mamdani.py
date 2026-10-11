import numpy as np
import skfuzzy as fuzz
from app.schemas.ot_scheduling import OTSchedulingInput, MamdaniOutput, MamdaniMembership, MamdaniRule


def run_mamdani(data: OTSchedulingInput) -> MamdaniOutput:
    urgency = data.surgical_urgency
    workload = data.surgeon_workload
    icu = data.icu_capacity

    x_urgency = np.arange(1, 11.1, 0.1)
    x_workload = np.arange(0, 101, 1)
    x_icu = np.arange(0, 101, 1)
    x_risk = np.arange(1, 11.1, 0.1)

    urgency_elective = fuzz.trimf(x_urgency, [1, 1, 4])
    urgency_urgent = fuzz.trimf(x_urgency, [3, 6.5, 10])
    urgency_emergency = fuzz.trimf(x_urgency, [7, 10, 10])

    workload_low = fuzz.trimf(x_workload, [0, 0, 40])
    workload_moderate = fuzz.trimf(x_workload, [30, 55, 80])
    workload_high = fuzz.trimf(x_workload, [60, 100, 100])

    icu_critical = fuzz.trimf(x_icu, [0, 0, 30])
    icu_limited = fuzz.trimf(x_icu, [20, 50, 80])
    icu_sufficient = fuzz.trimf(x_icu, [60, 100, 100])

    risk_low = fuzz.trimf(x_risk, [1, 1, 4])
    risk_moderate = fuzz.trimf(x_risk, [3, 5.5, 8])
    risk_high = fuzz.trimf(x_risk, [6, 10, 10])

    u_elective = fuzz.interp_membership(x_urgency, urgency_elective, urgency)
    u_urgent = fuzz.interp_membership(x_urgency, urgency_urgent, urgency)
    u_emergency = fuzz.interp_membership(x_urgency, urgency_emergency, urgency)

    w_low = fuzz.interp_membership(x_workload, workload_low, workload)
    w_moderate = fuzz.interp_membership(x_workload, workload_moderate, workload)
    w_high = fuzz.interp_membership(x_workload, workload_high, workload)

    i_critical = fuzz.interp_membership(x_icu, icu_critical, icu)
    i_limited = fuzz.interp_membership(x_icu, icu_limited, icu)
    i_sufficient = fuzz.interp_membership(x_icu, icu_sufficient, icu)

    urgency_memberships = [
        MamdaniMembership(label="elective", degree=round(u_elective, 4)),
        MamdaniMembership(label="urgent", degree=round(u_urgent, 4)),
        MamdaniMembership(label="emergency", degree=round(u_emergency, 4)),
    ]
    workload_memberships = [
        MamdaniMembership(label="low", degree=round(w_low, 4)),
        MamdaniMembership(label="moderate", degree=round(w_moderate, 4)),
        MamdaniMembership(label="high", degree=round(w_high, 4)),
    ]
    icu_memberships = [
        MamdaniMembership(label="critical", degree=round(i_critical, 4)),
        MamdaniMembership(label="limited", degree=round(i_limited, 4)),
        MamdaniMembership(label="sufficient", degree=round(i_sufficient, 4)),
    ]

    rule1_deg = min(u_emergency, i_critical)
    rule2_deg = min(u_elective, w_high)
    rule3_deg = min(u_urgent, w_moderate)
    rule4_deg = min(u_emergency, i_sufficient)
    rule5_deg = min(u_elective, i_sufficient)

    activated_rules = []
    if rule1_deg > 0:
        activated_rules.append(MamdaniRule(
            rule_number=1,
            description="Emergency urgency AND critical ICU capacity -> Emergency Override",
            antecedent_degree=round(rule1_deg, 4),
            risk_level="high",
            risk_degree=round(rule1_deg, 4),
        ))
    if rule2_deg > 0:
        activated_rules.append(MamdaniRule(
            rule_number=2,
            description="Elective urgency AND high surgeon workload -> Reschedule Elective",
            antecedent_degree=round(rule2_deg, 4),
            risk_level="moderate",
            risk_degree=round(rule2_deg, 4),
        ))
    if rule3_deg > 0:
        activated_rules.append(MamdaniRule(
            rule_number=3,
            description="Urgent surgery AND moderate workload -> elevated risk",
            antecedent_degree=round(rule3_deg, 4),
            risk_level="moderate",
            risk_degree=round(rule3_deg, 4),
        ))
    if rule4_deg > 0:
        activated_rules.append(MamdaniRule(
            rule_number=4,
            description="Emergency urgency AND sufficient ICU -> proceed with high priority",
            antecedent_degree=round(rule4_deg, 4),
            risk_level="moderate",
            risk_degree=round(rule4_deg, 4),
        ))
    if rule5_deg > 0:
        activated_rules.append(MamdaniRule(
            rule_number=5,
            description="Elective urgency AND sufficient ICU -> proceed as scheduled",
            antecedent_degree=round(rule5_deg, 4),
            risk_level="low",
            risk_degree=round(rule5_deg, 4),
        ))

    if not activated_rules:
        return MamdaniOutput(
            risk_score=0.0,
            scheduling_action="No rules activated",
            urgency_memberships=urgency_memberships,
            workload_memberships=workload_memberships,
            icu_memberships=icu_memberships,
            activated_rules=[],
        )

    zero = np.zeros_like(x_risk)
    risk_low_act = np.minimum(rule5_deg, risk_low) if rule5_deg > 0 else zero.copy()
    risk_moderate_act = np.minimum(np.fmax(np.fmax(rule2_deg, rule3_deg), rule4_deg), risk_moderate) if (rule2_deg > 0 or rule3_deg > 0 or rule4_deg > 0) else zero.copy()
    risk_high_act = np.minimum(rule1_deg, risk_high) if rule1_deg > 0 else zero.copy()

    aggregated = np.fmax(risk_low_act, np.fmax(risk_moderate_act, risk_high_act))
    if np.sum(aggregated) == 0:
        return MamdaniOutput(
            risk_score=0.0,
            scheduling_action="No rules activated",
            urgency_memberships=urgency_memberships,
            workload_memberships=workload_memberships,
            icu_memberships=icu_memberships,
            activated_rules=activated_rules,
        )
    risk_score = fuzz.defuzz(x_risk, aggregated, "centroid")

    if risk_score < 3.5:
        action = "Proceed as Scheduled"
    elif risk_score < 6.5:
        action = "Reschedule Elective"
    else:
        action = "Emergency Override"

    return MamdaniOutput(
        risk_score=round(risk_score, 2),
        scheduling_action=action,
        urgency_memberships=urgency_memberships,
        workload_memberships=workload_memberships,
        icu_memberships=icu_memberships,
        activated_rules=activated_rules,
    )
