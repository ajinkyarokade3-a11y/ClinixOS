from fastapi import APIRouter, HTTPException
from app.schemas.market import MarketConfig, MarketSimulation
from app.services.minimax import minimax_search, round_payoff

router = APIRouter(prefix="/api/market", tags=["Market Strategy"])


@router.post("/simulate", response_model=MarketSimulation)
def simulate(cfg: MarketConfig) -> MarketSimulation:
    try:
        prices = sorted(set(cfg.price_options))
        if len(prices) < 2:
            raise HTTPException(status_code=400, detail="Provide at least 2 distinct price options")
        if any(p <= 0 for p in prices):
            raise HTTPException(status_code=400, detail="All price options must be positive")
        cfg.price_options = prices
        result = minimax_search(cfg, depth=cfg.search_depth, use_alpha_beta=cfg.use_alpha_beta)
        return MarketSimulation(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


@router.post("/payoff")
def payoff(own_price: float, rival_price: float, cfg: MarketConfig) -> dict:
    if own_price <= 0 or rival_price <= 0:
        raise HTTPException(status_code=400, detail="Prices must be positive")
    return round_payoff(own_price, rival_price, cfg)
