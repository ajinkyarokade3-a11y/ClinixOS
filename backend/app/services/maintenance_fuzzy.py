import numpy as np
import skfuzzy as fuzz


def sugeno_inference(operating_hours: float, stress_index: float,
                     temperature: float | None = None,
                     vibration: float | None = None) -> dict:
    x_hours = np.arange(0, 10001, 100)
    x_stress = np.arange(0, 101, 1)
    x_risk = np.arange(0, 101, 1)

    hours_low = fuzz.trimf(x_hours, [0, 0, 3000])
    hours_medium = fuzz.trimf(x_hours, [2000, 5000, 8000])
    hours_high = fuzz.trimf(x_hours, [6000, 10000, 10000])

    stress_low = fuzz.trimf(x_stress, [0, 0, 40])
    stress_medium = fuzz.trimf(x_stress, [30, 55, 80])
    stress_high = fuzz.trimf(x_stress, [60, 100, 100])

    risk_low = fuzz.trimf(x_risk, [0, 0, 35])
    risk_moderate = fuzz.trimf(x_risk, [25, 50, 75])
    risk_high = fuzz.trimf(x_risk, [60, 100, 100])

    h_low = fuzz.interp_membership(x_hours, hours_low, operating_hours)
    h_medium = fuzz.interp_membership(x_hours, hours_medium, operating_hours)
    h_high = fuzz.interp_membership(x_hours, hours_high, operating_hours)

    s_low = fuzz.interp_membership(x_stress, stress_low, stress_index)
    s_medium = fuzz.interp_membership(x_stress, stress_medium, stress_index)
    s_high = fuzz.interp_membership(x_stress, stress_high, stress_index)

    temp_factor = 1.0
    vib_factor = 1.0
    if temperature is not None:
        if temperature > 70:
            temp_factor = 1.3
        elif temperature > 50:
            temp_factor = 1.1
    if vibration is not None:
        if vibration > 20:
            vib_factor = 1.3
        elif vibration > 10:
            vib_factor = 1.1

    env_factor = max(temp_factor, vib_factor)

    rules = []

    r1 = min(h_low, s_low)
    if r1 > 0:
        out1 = 10.0
        rules.append({"rule": 1, "desc": "Low hours AND Low stress", "degree": round(r1, 4), "output": out1})

    r2 = min(h_low, s_medium)
    if r2 > 0:
        out2 = 25.0
        rules.append({"rule": 2, "desc": "Low hours AND Medium stress", "degree": round(r2, 4), "output": out2})

    r3 = min(h_low, s_high)
    if r3 > 0:
        out3 = 45.0
        rules.append({"rule": 3, "desc": "Low hours AND High stress", "degree": round(r3, 4), "output": out3})

    r4 = min(h_medium, s_low)
    if r4 > 0:
        out4 = 30.0
        rules.append({"rule": 4, "desc": "Medium hours AND Low stress", "degree": round(r4, 4), "output": out4})

    r5 = min(h_medium, s_medium)
    if r5 > 0:
        out5 = 50.0
        rules.append({"rule": 5, "desc": "Medium hours AND Medium stress", "degree": round(r5, 4), "output": out5})

    r6 = min(h_medium, s_high)
    if r6 > 0:
        out6 = 70.0
        rules.append({"rule": 6, "desc": "Medium hours AND High stress", "degree": round(r6, 4), "output": out6})

    r7 = min(h_high, s_low)
    if r7 > 0:
        out7 = 55.0
        rules.append({"rule": 7, "desc": "High hours AND Low stress", "degree": round(r7, 4), "output": out7})

    r8 = min(h_high, s_medium)
    if r8 > 0:
        out8 = 75.0
        rules.append({"rule": 8, "desc": "High hours AND Medium stress", "degree": round(r8, 4), "output": out8})

    r9 = min(h_high, s_high)
    if r9 > 0:
        out9 = 95.0
        rules.append({"rule": 9, "desc": "High hours AND High stress", "degree": round(r9, 4), "output": out9})

    if not rules:
        return {
            "risk": 0.0,
            "rules": [],
            "memberships": {
                "hours": [{"label": "low", "degree": round(h_low, 4)}, {"label": "medium", "degree": round(h_medium, 4)}, {"label": "high", "degree": round(h_high, 4)}],
                "stress": [{"label": "low", "degree": round(s_low, 4)}, {"label": "medium", "degree": round(s_medium, 4)}, {"label": "high", "degree": round(s_high, 4)}],
            },
        }

    numerator = sum(r["degree"] * r["output"] for r in rules)
    denominator = sum(r["degree"] for r in rules)
    risk = numerator / denominator if denominator > 0 else 0.0
    risk = risk * env_factor
    risk = min(risk, 100.0)

    return {
        "risk": round(risk, 2),
        "rules": rules,
        "memberships": {
            "hours": [{"label": "low", "degree": round(h_low, 4)}, {"label": "medium", "degree": round(h_medium, 4)}, {"label": "high", "degree": round(h_high, 4)}],
            "stress": [{"label": "low", "degree": round(s_low, 4)}, {"label": "medium", "degree": round(s_medium, 4)}, {"label": "high", "degree": round(s_high, 4)}],
        },
    }
