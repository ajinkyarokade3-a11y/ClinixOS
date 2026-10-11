import pytest
from app.services.maintenance_fuzzy import sugeno_inference


def test_low_hours_low_stress():
    result = sugeno_inference(500, 20)
    assert result["risk"] < 25
    assert len(result["rules"]) > 0


def test_high_hours_high_stress():
    result = sugeno_inference(9000, 90)
    assert result["risk"] > 70
    assert len(result["rules"]) > 0


def test_medium_hours_medium_stress():
    result = sugeno_inference(5000, 55)
    assert 30 < result["risk"] < 70
    assert len(result["rules"]) > 0


def test_temperature_factor():
    normal = sugeno_inference(5000, 55)
    with_temp = sugeno_inference(5000, 55, temperature=80)
    assert with_temp["risk"] >= normal["risk"]


def test_vibration_factor():
    normal = sugeno_inference(5000, 55)
    with_vib = sugeno_inference(5000, 55, vibration=25)
    assert with_vib["risk"] >= normal["risk"]


def test_memberships_present():
    result = sugeno_inference(5000, 55)
    assert "hours" in result["memberships"]
    assert "stress" in result["memberships"]
    assert len(result["memberships"]["hours"]) == 3
    assert len(result["memberships"]["stress"]) == 3


def test_all_combinations_covered():
    for hours in [500, 3000, 7000]:
        for stress in [20, 55, 85]:
            result = sugeno_inference(hours, stress)
            assert result["risk"] >= 0
            assert result["risk"] <= 100
            assert len(result["rules"]) > 0
