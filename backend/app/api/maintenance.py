from fastapi import APIRouter, HTTPException
from app.schemas.maintenance import (
    EquipmentCreate, EquipmentResponse, RiskPrediction,
    MaintenanceQueueItem, TrainingResult, ModelEvaluation,
)
from app.services.maintenance_data import (
    generate_equipment_inventory, generate_usage_history,
    generate_maintenance_records, generate_training_data,
)
from app.services.maintenance_hnfs import predict_risk
from app.services.maintenance_training import train_model, evaluate_model
from app.services.maintenance_nn import NumpyMLP

router = APIRouter(prefix="/api/maintenance", tags=["Predictive Maintenance"])

_model: NumpyMLP | None = None
_model_trained = False


def get_model() -> NumpyMLP:
    global _model, _model_trained
    if _model is None:
        _model, _ = train_model(epochs=200)
        _model_trained = True
    return _model


@router.get("/inventory", response_model=list[EquipmentResponse])
def get_inventory() -> list[EquipmentResponse]:
    try:
        inventory = generate_equipment_inventory(count=50)
        model = get_model()
        result = []
        for eq in inventory:
            pred = predict_risk(
                eq["operating_hours"], eq["stress_index"],
                eq.get("temperature"), eq.get("vibration"), model,
            )
            result.append(EquipmentResponse(
                id=eq["id"],
                name=eq["name"],
                equipment_type=eq["equipment_type"],
                department=eq["department"],
                operating_hours=eq["operating_hours"],
                stress_index=eq["stress_index"],
                temperature=eq.get("temperature"),
                vibration=eq.get("vibration"),
                risk_score=pred["risk_score"],
                maintenance_tier=pred["maintenance_tier"],
                fuzzy_risk=pred["fuzzy_risk"],
                nn_risk=pred["nn_risk"],
                created_at="2026-10-11",
            ))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inventory error: {str(e)}")


@router.get("/equipment/{equipment_id}", response_model=EquipmentResponse)
def get_equipment(equipment_id: int) -> EquipmentResponse:
    try:
        inventory = generate_equipment_inventory(count=50)
        eq = next((e for e in inventory if e["id"] == equipment_id), None)
        if eq is None:
            raise HTTPException(status_code=404, detail="Equipment not found")
        model = get_model()
        pred = predict_risk(
            eq["operating_hours"], eq["stress_index"],
            eq.get("temperature"), eq.get("vibration"), model,
        )
        return EquipmentResponse(
            id=eq["id"],
            name=eq["name"],
            equipment_type=eq["equipment_type"],
            department=eq["department"],
            operating_hours=eq["operating_hours"],
            stress_index=eq["stress_index"],
            temperature=eq.get("temperature"),
            vibration=eq.get("vibration"),
            risk_score=pred["risk_score"],
            maintenance_tier=pred["maintenance_tier"],
            fuzzy_risk=pred["fuzzy_risk"],
            nn_risk=pred["nn_risk"],
            created_at="2026-10-11",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Equipment detail error: {str(e)}")


@router.post("/predict", response_model=RiskPrediction)
def predict_maintenance(data: EquipmentCreate) -> RiskPrediction:
    try:
        model = get_model()
        return predict_risk(
            data.operating_hours, data.stress_index,
            data.temperature, data.vibration, model,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.get("/queue", response_model=list[MaintenanceQueueItem])
def get_maintenance_queue() -> list[MaintenanceQueueItem]:
    try:
        inventory = generate_equipment_inventory(count=50)
        model = get_model()
        items = []
        for eq in inventory:
            pred = predict_risk(
                eq["operating_hours"], eq["stress_index"],
                eq.get("temperature"), eq.get("vibration"), model,
            )
            items.append(MaintenanceQueueItem(
                equipment_id=eq["id"],
                name=eq["name"],
                equipment_type=eq["equipment_type"],
                department=eq["department"],
                risk_score=pred["risk_score"],
                maintenance_tier=pred["maintenance_tier"],
                operating_hours=eq["operating_hours"],
                stress_index=eq["stress_index"],
            ))
        return sorted(items, key=lambda x: x.risk_score, reverse=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Queue error: {str(e)}")


@router.get("/equipment/{equipment_id}/history")
def get_equipment_history(equipment_id: int) -> list[dict]:
    try:
        return generate_usage_history(equipment_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"History error: {str(e)}")


@router.get("/equipment/{equipment_id}/records")
def get_maintenance_records(equipment_id: int) -> list[dict]:
    try:
        return generate_maintenance_records(equipment_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Records error: {str(e)}")


@router.post("/train", response_model=TrainingResult)
def train() -> TrainingResult:
    try:
        _, metrics = train_model(epochs=200)
        return TrainingResult(**metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")


@router.get("/evaluate", response_model=ModelEvaluation)
def evaluate() -> ModelEvaluation:
    try:
        model = get_model()
        X_list, y_list = generate_training_data(count=500, seed=999)
        import numpy as np
        X = np.array(X_list)
        y = np.array(y_list).reshape(-1, 1)
        split = int(0.8 * len(X))
        result = evaluate_model(model, X[split:], y[split:])
        return ModelEvaluation(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation error: {str(e)}")
