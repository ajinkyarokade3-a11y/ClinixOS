from pydantic import BaseModel, Field


class MarketConfig(BaseModel):
    rounds: int = Field(3, ge=1, le=6)
    price_options: list[float] = Field(..., min_length=2, max_length=8)
    base_demand: float = Field(1000.0, ge=1)
    price_sensitivity: float = Field(..., ge=0.01)
    cross_sensitivity: float = Field(..., ge=0)
    capacity: float = Field(..., ge=1)
    unit_cost: float = Field(..., ge=0)
    fixed_cost_per_round: float = Field(0.0, ge=0)
    search_depth: int = Field(2, ge=1, le=6)
    use_alpha_beta: bool = True


class GameNode(BaseModel):
    id: int
    parent_id: int | None
    turn: str
    move_label: str
    value: float
    pruned: bool = False
    children_ids: list[int] = []


class PriceAlternative(BaseModel):
    price: float
    predicted_total_profit: float
    immediate_revenue: float
    immediate_profit: float
    immediate_share: float


class RoundResult(BaseModel):
    round: int
    our_price: float
    rival_price: float
    demand: float
    units: float
    revenue: float
    profit: float
    share: float


class MarketSimulation(BaseModel):
    best_price: float
    predicted_total_profit: float
    simulated_total_profit: float
    simulated_total_revenue: float
    simulated_avg_share: float
    alternatives: list[PriceAlternative]
    rounds: list[RoundResult]
    tree: list[GameNode]
    explored_states: int
    pruned_states: int
    depth: int
    alpha_beta: bool
    assumptions: list[str]
