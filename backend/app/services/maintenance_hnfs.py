import numpy as np
from app.services.maintenance_fuzzy import sugeno_inference
from app.services.maintenance_nn import NumpyMLP, normalize_features, denormalize_risk


def combine_hnfs(fuzzy_risk: float, nn_risk: float,
                 fuzzy_weight: float = 0.5, nn_weight: float = 0.5) -> dict:
    total_weight = fuzzy_weight + nn_weight
    fw = fuzzy_weight / total_weight
    nw = nn_weight / total_weight
    combined = fw * fuzzy_risk + nw * nn_risk
    combined = min(max(combined, 0.0), 100.0)

    if combined < 30:
        tier = "Routine Check"
    elif combined < 65:
        tier = "Preventive Maintenance"
    else:
        tier = "Immediate Servicing"

    return {
        "risk_score": round(combined, 2),
        "maintenance_tier": tier,
        "fuzzy_risk": round(fuzzy_risk, 2),
        "nn_risk": round(nn_risk, 2),
        "fuzzy_weight": round(fw, 4),
        "nn_weight": round(nw, 4),
        "combination_method": "weighted_average",
    }


def predict_risk(operating_hours: float, stress_index: float,
                 temperature: float | None = None, vibration: float | None = None,
                 model: NumpyMLP | None = None) -> dict:
    fuzzy_result = sugeno_inference(operating_hours, stress_index, temperature, vibration)
    fuzzy_risk = fuzzy_result["risk"]

    if model is not None:
        features = normalize_features(operating_hours, stress_index, temperature, vibration)
        nn_pred = model.predict(features)
        nn_risk = denormalize_risk(float(nn_pred[0][0]))
    else:
        nn_risk = fuzzy_risk

    combined = combine_hnfs(fuzzy_risk, nn_risk)

    return {
        **combined,
        "fuzzy_rules": fuzzy_result["rules"],
        "fuzzy_memberships": fuzzy_result["memberships"],
        "nn_confidence": round(1.0 - abs(fuzzy_risk - nn_risk) / 100.0, 4) if model is not None else 1.0,
    }
