import pytest
from app.services.maintenance_hnfs import combine_hnfs, predict_risk
from app.services.maintenance_nn import NumpyMLP


def test_combine_equal_weights():
    result = combine_hnfs(40, 60, fuzzy_weight=0.5, nn_weight=0.5)
    assert result["risk_score"] == 50.0
    assert result["maintenance_tier"] == "Preventive Maintenance"


def test_combine_fuzzy_dominant():
    result = combine_hnfs(20, 80, fuzzy_weight=0.8, nn_weight=0.2)
    assert result["risk_score"] < 50


def test_combine_nn_dominant():
    result = combine_hnfs(20, 80, fuzzy_weight=0.2, nn_weight=0.8)
    assert result["risk_score"] > 50


def test_tier_routine():
    result = combine_hnfs(10, 20)
    assert result["maintenance_tier"] == "Routine Check"


def test_tier_preventive():
    result = combine_hnfs(40, 50)
    assert result["maintenance_tier"] == "Preventive Maintenance"


def test_tier_immediate():
    result = combine_hnfs(80, 90)
    assert result["maintenance_tier"] == "Immediate Servicing"


def test_predict_without_model():
    result = predict_risk(5000, 55)
    assert result["risk_score"] >= 0
    assert result["risk_score"] <= 100
    assert "fuzzy_rules" in result
    assert "fuzzy_memberships" in result


def test_predict_with_model():
    model = NumpyMLP(seed=42)
    result = predict_risk(5000, 55, model=model)
    assert result["risk_score"] >= 0
    assert result["risk_score"] <= 100
    assert result["nn_risk"] > 0
    assert "nn_confidence" in result


def test_risk_bounds():
    result = predict_risk(9999, 99, temperature=90, vibration=40)
    assert result["risk_score"] <= 100
    result2 = predict_risk(0, 0)
    assert result2["risk_score"] >= 0
