"""Hypothetical two-supplier pricing simulator (synthetic data, not market research).

Model (documented assumptions):
- Two suppliers A (maximizer, "us") and B (minimizer, competitor) choose prices
  each round from a shared configurable price menu.
- Synthetic demand for supplier i in a round:
    base_demand
    - price_sensitivity × own_price
    + cross_sensitivity × rival_price
  clamped to [0, capacity]. Lower own price and higher rival price raise demand.
- Units sold = min(demand, capacity). Revenue = price × units.
  Profit (payoff) = revenue − unit_cost × units − fixed_cost_per_round.
- Competitor response model: B is assumed to pick the price that minimizes A's
  profit (adversarial). Game value = A's total profit over the remaining rounds.
- Minimax with optional alpha-beta pruning over `depth` plies (one ply = one
  round of A-then-B moves). Search statistics (explored/pruned states) are
  reported so pruning can be verified.
"""

from app.schemas.market import MarketConfig, GameNode


def round_payoff(own_price: float, rival_price: float, cfg: MarketConfig) -> dict:
    demand_a = cfg.base_demand - cfg.price_sensitivity * own_price + cfg.cross_sensitivity * rival_price
    demand_a = max(0.0, min(demand_a, cfg.capacity))
    units_a = demand_a
    revenue_a = own_price * units_a
    profit_a = revenue_a - cfg.unit_cost * units_a - cfg.fixed_cost_per_round
    share_a = units_a / (2 * cfg.capacity) if cfg.capacity > 0 else 0.0
    return {
        "demand": round(demand_a, 2),
        "units": round(units_a, 2),
        "revenue": round(revenue_a, 2),
        "profit": round(profit_a, 2),
        "share": round(share_a, 4),
    }


def minimax_search(cfg: MarketConfig, depth: int, use_alpha_beta: bool = True) -> dict:
    prices = sorted(cfg.price_options)
    stats = {"explored": 0, "pruned": 0}
    tree: list[GameNode] = []
    node_counter = [0]

    def recurse(round_no: int, turn: str, alpha: float, beta: float,
                parent_id: int | None, move_label: str,
                a_price: float | None = None) -> tuple[float, int]:
        node_id = node_counter[0]
        node_counter[0] += 1
        stats["explored"] += 1

        if round_no > cfg.rounds:
            node = GameNode(id=node_id, parent_id=parent_id, turn="terminal",
                            move_label=move_label, value=0.0, pruned=False, children_ids=[])
            tree.append(node)
            return 0.0, node_id

        is_max = (turn == "A")
        best = float("-inf") if is_max else float("inf")
        children_ids: list[int] = []

        for price in prices:
            if is_max:
                # A chooses its price for this round; payoff resolved once B responds.
                child_value, child_id = recurse(round_no, "B", alpha, beta,
                                                node_id, f"A={price}", a_price=price)
                children_ids.append(child_id)
                if child_value > best:
                    best = child_value
                alpha = max(alpha, best)
            else:
                # B responds; round payoff is now determined (A's price is fixed).
                assert a_price is not None
                immediate = round_payoff(a_price, price, cfg)["profit"]
                future, child_id = recurse(round_no + 1, "A", alpha, beta,
                                           node_id, f"B={price}")
                total = immediate + future
                children_ids.append(child_id)
                if total < best:
                    best = total
                beta = min(beta, best)
            if use_alpha_beta and beta <= alpha:
                stats["pruned"] += len(prices) - prices.index(price) - 1
                break

        node = GameNode(id=node_id, parent_id=parent_id, turn=turn,
                        move_label=move_label or f"round-{round_no}-{turn}",
                        value=round(best, 2), pruned=False, children_ids=children_ids)
        tree.append(node)
        return best, node_id

    value, root_id = recurse(1, "A", float("-inf"), float("inf"), None, "root")

    # Evaluate each first-round price from the searched tree: the value of the
    # B-node child labelled A={price} is the exact minimax continuation value.
    by_id = {n.id: n for n in tree}
    root = next(n for n in tree if n.parent_id is None)
    tree_cont: dict[float, float] = {}
    for cid in root.children_ids:
        child = by_id[cid]
        try:
            p = float(child.move_label.split("=")[1])
        except (IndexError, ValueError):
            continue
        tree_cont[p] = child.value

    alternatives = []
    for price in prices:
        if price in tree_cont:
            cont_value = tree_cont[price]
        else:
            cont_value, _ = _evaluate_continuation(cfg, price, stats, use_alpha_beta)
        immediate = round_payoff(price, _rival_best_response(cfg, price), cfg)
        alternatives.append({
            "price": price,
            "predicted_total_profit": round(cont_value, 2),
            "immediate_revenue": immediate["revenue"],
            "immediate_profit": immediate["profit"],
            "immediate_share": immediate["share"],
        })
    alternatives.sort(key=lambda a: a["predicted_total_profit"], reverse=True)
    best_price = alternatives[0]["price"] if alternatives else prices[0]

    # Simulate the recommended path: A plays minimax each round, B responds adversarially.
    rounds_sim = []
    for r in range(1, cfg.rounds + 1):
        rival = _rival_best_response(cfg, best_price)
        payoff = round_payoff(best_price, rival, cfg)
        rounds_sim.append({
            "round": r, "our_price": best_price, "rival_price": rival, **payoff,
        })

    total_profit = round(sum(x["profit"] for x in rounds_sim), 2)
    total_revenue = round(sum(x["revenue"] for x in rounds_sim), 2)
    avg_share = round(sum(x["share"] for x in rounds_sim) / max(len(rounds_sim), 1), 4)

    return {
        "best_price": best_price,
        "predicted_total_profit": round(value, 2),
        "simulated_total_profit": total_profit,
        "simulated_total_revenue": total_revenue,
        "simulated_avg_share": avg_share,
        "alternatives": alternatives,
        "rounds": rounds_sim,
        "tree": [n.model_dump() for n in tree],
        "explored_states": stats["explored"],
        "pruned_states": stats["pruned"],
        "depth": depth,
        "alpha_beta": use_alpha_beta,
        "assumptions": [
            "Synthetic linear demand; not calibrated to any real market.",
            "Competitor B is modelled as purely adversarial (minimizes A's profit).",
            f"Depth {depth} plies; one ply = one supplier move.",
            "Units sold capped by production capacity; unmet demand is lost.",
        ],
    }


def _rival_best_response(cfg: MarketConfig, our_price: float) -> float:
    best_price = cfg.price_options[0]
    best_rival_profit = float("-inf")
    for rival_price in cfg.price_options:
        demand_b = cfg.base_demand - cfg.price_sensitivity * rival_price + cfg.cross_sensitivity * our_price
        demand_b = max(0.0, min(demand_b, cfg.capacity))
        profit_b = rival_price * demand_b - cfg.unit_cost * demand_b - cfg.fixed_cost_per_round
        if profit_b > best_rival_profit:
            best_rival_profit = profit_b
            best_price = rival_price
    return best_price


def _evaluate_continuation(cfg: MarketConfig, first_price: float,
                           stats: dict, use_alpha_beta: bool) -> tuple[float, None]:
    """Exact minimax value of playing first_price in round 1 (B responds, then full search)."""
    rival = _rival_best_response(cfg, first_price)
    immediate = round_payoff(first_price, rival, cfg)["profit"]
    if cfg.rounds == 1:
        return immediate, None
    future = _future_value(cfg, 2, stats, use_alpha_beta, float("-inf"), float("inf"))
    return immediate + future, None


def _future_value(cfg: MarketConfig, round_no: int, stats: dict,
                  use_alpha_beta: bool, alpha: float, beta: float) -> float:
    prices = sorted(cfg.price_options)
    best = float("-inf")
    for our in prices:
        worst = float("inf")
        for rival in prices:
            stats["explored"] += 1
            immediate = round_payoff(our, rival, cfg)["profit"]
            future = 0.0 if round_no >= cfg.rounds else _future_value(
                cfg, round_no + 1, stats, use_alpha_beta, alpha, beta)
            total = immediate + future
            if total < worst:
                worst = total
            beta = min(beta, worst)
            if use_alpha_beta and beta <= alpha:
                stats["pruned"] += 1
                break
        if worst > best:
            best = worst
        alpha = max(alpha, best)
        if use_alpha_beta and beta <= alpha:
            break
    return best
