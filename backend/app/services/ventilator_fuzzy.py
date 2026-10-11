import numpy as np
import skfuzzy as fuzz
from app.schemas.ventilator import VentilatorInput, VentilatorOutput, MembershipDegree, ActivatedRule


def run_ventilator_simulation(data: VentilatorInput) -> VentilatorOutput:
    spo2 = data.spo2
    rr = data.respiration_rate

    x_spo2 = np.arange(70, 101, 1)
    x_rr = np.arange(10, 41, 1)
    x_flow = np.arange(0, 16, 0.1)

    spo2_critical = fuzz.trimf(x_spo2, [70, 70, 82])
    spo2_low = fuzz.trimf(x_spo2, [78, 85, 92])
    spo2_normal = fuzz.trimf(x_spo2, [90, 95, 100])

    rr_slow = fuzz.trimf(x_rr, [10, 10, 16])
    rr_normal = fuzz.trimf(x_rr, [14, 20, 26])
    rr_rapid = fuzz.trimf(x_rr, [24, 32, 40])

    flow_low = fuzz.trimf(x_flow, [0, 0, 5])
    flow_moderate = fuzz.trimf(x_flow, [4, 7.5, 11])
    flow_high = fuzz.trimf(x_flow, [9, 12, 15])

    spo2_critical_deg = fuzz.interp_membership(x_spo2, spo2_critical, spo2)
    spo2_low_deg = fuzz.interp_membership(x_spo2, spo2_low, spo2)
    spo2_normal_deg = fuzz.interp_membership(x_spo2, spo2_normal, spo2)

    rr_slow_deg = fuzz.interp_membership(x_rr, rr_slow, rr)
    rr_normal_deg = fuzz.interp_membership(x_rr, rr_normal, rr)
    rr_rapid_deg = fuzz.interp_membership(x_rr, rr_rapid, rr)

    spo2_memberships = [
        MembershipDegree(label="critical", degree=round(spo2_critical_deg, 4)),
        MembershipDegree(label="low", degree=round(spo2_low_deg, 4)),
        MembershipDegree(label="normal", degree=round(spo2_normal_deg, 4)),
    ]
    respiration_memberships = [
        MembershipDegree(label="slow", degree=round(rr_slow_deg, 4)),
        MembershipDegree(label="normal", degree=round(rr_normal_deg, 4)),
        MembershipDegree(label="rapid", degree=round(rr_rapid_deg, 4)),
    ]

    rule1_deg = max(spo2_critical_deg, rr_rapid_deg)
    rule2_deg = min(spo2_low_deg, rr_normal_deg)
    rule3_deg = min(spo2_normal_deg, rr_normal_deg)

    activated_rules = []
    if rule1_deg > 0:
        activated_rules.append(ActivatedRule(
            rule_number=1,
            description="Critical SpO2 OR rapid respiration -> high flow",
            antecedent_degree=round(rule1_deg, 4),
            consequent="high",
            consequent_degree=round(rule1_deg, 4),
        ))
    if rule2_deg > 0:
        activated_rules.append(ActivatedRule(
            rule_number=2,
            description="Low SpO2 AND normal respiration -> moderate flow",
            antecedent_degree=round(rule2_deg, 4),
            consequent="moderate",
            consequent_degree=round(rule2_deg, 4),
        ))
    if rule3_deg > 0:
        activated_rules.append(ActivatedRule(
            rule_number=3,
            description="Normal SpO2 AND normal respiration -> low flow",
            antecedent_degree=round(rule3_deg, 4),
            consequent="low",
            consequent_degree=round(rule3_deg, 4),
        ))

    if not activated_rules:
        return VentilatorOutput(
            oxygen_flow=0.0,
            spo2_memberships=spo2_memberships,
            respiration_memberships=respiration_memberships,
            activated_rules=[],
            aggregated_output=[],
            sample_input={"spo2": spo2, "respiration_rate": rr},
        )

    zero = np.zeros_like(x_flow)
    flow_low_act = np.minimum(rule3_deg, flow_low) if rule3_deg > 0 else zero.copy()
    flow_moderate_act = np.minimum(rule2_deg, flow_moderate) if rule2_deg > 0 else zero.copy()
    flow_high_act = np.minimum(rule1_deg, flow_high) if rule1_deg > 0 else zero.copy()
    aggregated = np.fmax(flow_low_act, np.fmax(flow_moderate_act, flow_high_act))

    if np.sum(aggregated) == 0:
        return VentilatorOutput(
            oxygen_flow=0.0,
            spo2_memberships=spo2_memberships,
            respiration_memberships=respiration_memberships,
            activated_rules=activated_rules,
            aggregated_output=[],
            sample_input={"spo2": spo2, "respiration_rate": rr},
        )

    oxygen_flow = fuzz.defuzz(x_flow, aggregated, "centroid")

    aggregated_output = [
        {"x": round(float(x), 1), "membership": round(float(m), 4)}
        for x, m in zip(x_flow, aggregated)
        if m > 0.001
    ]

    return VentilatorOutput(
        oxygen_flow=round(float(oxygen_flow), 2),
        spo2_memberships=spo2_memberships,
        respiration_memberships=respiration_memberships,
        activated_rules=activated_rules,
        aggregated_output=aggregated_output,
        sample_input={"spo2": spo2, "respiration_rate": rr},
    )
