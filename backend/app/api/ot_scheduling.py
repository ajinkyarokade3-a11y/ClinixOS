from fastapi import APIRouter, HTTPException
from app.schemas.ot_scheduling import (
    OTSchedulingInput,
    MamdaniOutput,
    SugenoOutput,
    SurgicalWorkflow,
    SimulationSummary,
)
from app.services.ot_mamdani import run_mamdani
from app.services.ot_sugeno import run_sugeno
from app.services.simulation import generate_workflows, summarize_workflows

router = APIRouter(prefix="/api/ot-scheduling", tags=["OT Scheduling"])


@router.post("/mamdani", response_model=MamdaniOutput)
def run_mamdani_endpoint(data: OTSchedulingInput) -> MamdaniOutput:
    try:
        result = run_mamdani(data)
        if not result.activated_rules:
            raise HTTPException(
                status_code=422,
                detail="No Mamdani rules activated for the given inputs.",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mamdani inference error: {str(e)}")


@router.post("/sugeno", response_model=SugenoOutput)
def run_sugeno_endpoint(data: OTSchedulingInput) -> SugenoOutput:
    try:
        result = run_sugeno(data)
        if not result.activated_rules:
            raise HTTPException(
                status_code=422,
                detail="No Sugeno rules activated for the given inputs.",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sugeno inference error: {str(e)}")


@router.post("/simulate", response_model=list[SurgicalWorkflow])
def run_simulation(count: int = 75) -> list[SurgicalWorkflow]:
    try:
        if count < 1 or count > 500:
            raise HTTPException(status_code=400, detail="Count must be between 1 and 500")
        return generate_workflows(count=count)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


@router.get("/simulate/summary", response_model=SimulationSummary)
def get_simulation_summary() -> SimulationSummary:
    try:
        workflows = generate_workflows(count=75)
        return summarize_workflows(workflows)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary error: {str(e)}")
