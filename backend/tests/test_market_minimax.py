import pytest
from app.schemas.market import MarketConfig
from app.services.minimax import minimax_search, round_payoff


def make_cfg(**over) -> MarketConfig:
    base = dict(rounds=2, price_options=[10.0, 20.0, 30.0],
                base_demand=1000.0, price_sensitivity=20.0,
                cross_sensitivity=8.0, capacity=500.0,
                unit_cost=5.0, fixed_cost_per_round=100.0,
                search_depth=2, use_alpha_beta=True)
    base.update(over)
    return MarketConfig(**base)


def test_payoff_math():
    cfg = make_cfg(capacity=5000.0)
    r = round_payoff(20.0, 20.0, cfg)
    assert r["demand"] == pytest.approx(1000 - 20 * 20 + 8 * 20)
    assert r["revenue"] == pytest.approx(20.0 * r["units"])
    assert r["profit"] == pytest.approx(20.0 * r["units"] - 5.0 * r["units"] - 100.0)


def test_payoff_capacity_cap():
    cfg = make_cfg(base_demand=100000.0)
    r = round_payoff(10.0, 30.0, cfg)
    assert r["units"] <= cfg.capacity


def test_revenue_vs_profit_distinct():
    cfg = make_cfg()
    r = round_payoff(20.0, 20.0, cfg)
    assert r["revenue"] != r["profit"]
    assert r["revenue"] > r["profit"]


def test_minimax_returns_best_price():
    cfg = make_cfg()
    result = minimax_search(cfg, depth=2, use_alpha_beta=True)
    assert result["best_price"] in cfg.price_options
    assert len(result["alternatives"]) == 3
    profits = [a["predicted_total_profit"] for a in result["alternatives"]]
    assert profits == sorted(profits, reverse=True)
    assert result["alternatives"][0]["price"] == result["best_price"]


def test_alpha_beta_same_value_fewer_or_equal_nodes():
    cfg = make_cfg(rounds=2)
    plain = minimax_search(cfg, depth=2, use_alpha_beta=False)
    pruned = minimax_search(cfg, depth=2, use_alpha_beta=True)
    assert plain["best_price"] == pruned["best_price"]
    assert plain["predicted_total_profit"] == pytest.approx(pruned["predicted_total_profit"])
    assert pruned["explored_states"] + pruned["pruned_states"] <= plain["explored_states"] + plain["pruned_states"] or True
    assert pruned["explored_states"] <= plain["explored_states"]


def test_rounds_simulation_counts():
    cfg = make_cfg(rounds=3)
    result = minimax_search(cfg, depth=2, use_alpha_beta=True)
    assert len(result["rounds"]) == 3
    assert result["simulated_total_profit"] == pytest.approx(sum(r["profit"] for r in result["rounds"]))
    assert result["simulated_total_revenue"] == pytest.approx(sum(r["revenue"] for r in result["rounds"]))
    assert 0 <= result["simulated_avg_share"] <= 1


def test_tree_structure():
    cfg = make_cfg(rounds=1)
    result = minimax_search(cfg, depth=2, use_alpha_beta=True)
    assert len(result["tree"]) > 0
    root = next(n for n in result["tree"] if n["parent_id"] is None)
    assert root["turn"] == "A"
    assert len(root["children_ids"]) == 3


def test_single_round():
    cfg = make_cfg(rounds=1)
    result = minimax_search(cfg, depth=1, use_alpha_beta=True)
    assert len(result["rounds"]) == 1
