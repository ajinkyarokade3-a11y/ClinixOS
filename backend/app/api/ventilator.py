from fastapi import APIRouter, HTTPException
from app.schemas.ventilator import VentilatorInput, VentilatorOutput
from app.services.ventilator_fuzzy import run_ventilator_simulation

router = APIRouter(prefix="/api/ventilator", tags=["Ventilator AI"])


@router.post("/simulate", response_model=VentilatorOutput)
def simulate_ventilator(data: VentilatorInput) -> VentilatorOutput:
    try:
        result = run_ventilator_simulation(data)
        if not result.activated_rules:
            raise HTTPException(
                status_code=422,
                detail="No fuzzy rules activated for the given inputs. Try values within the overlapping fuzzy set ranges.",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


@router.get("/sample")
def get_sample() -> VentilatorOutput:
    sample = VentilatorInput(spo2=84, respiration_rate=18)
    return run_ventilator_simulation(sample)
