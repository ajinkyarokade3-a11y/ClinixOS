from pydantic import BaseModel, Field
from typing import Optional


class EquipmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    equipment_type: str = Field(..., min_length=1, max_length=100)
    department: str = Field(..., min_length=1, max_length=100)
    operating_hours: float = Field(..., ge=0, le=100000)
    stress_index: float = Field(..., ge=0, le=100)
    temperature: Optional[float] = Field(None, ge=0, le=150)
    vibration: Optional[float] = Field(None, ge=0, le=50)


class EquipmentResponse(BaseModel):
    id: int
    name: str
    equipment_type: str
    department: str
    operating_hours: float
    stress_index: float
    temperature: Optional[float] = None
    vibration: Optional[float] = None
    risk_score: float
    maintenance_tier: str
    fuzzy_risk: float
    nn_risk: float
    created_at: str


class RiskPrediction(BaseModel):
    risk_score: float
    maintenance_tier: str
    fuzzy_risk: float
    nn_risk: float
    fuzzy_rules: list[dict]
    fuzzy_memberships: dict[str, list[dict[str, float]]]
    nn_confidence: float
    combination_method: str


class MaintenanceQueueItem(BaseModel):
    equipment_id: int
    name: str
    equipment_type: str
    department: str
    risk_score: float
    maintenance_tier: str
    operating_hours: float
    stress_index: float


class TrainingResult(BaseModel):
    epochs: int
    final_loss: float
    val_loss: float
    mae: float
    rmse: float
    r2_score: float
    training_history: list[dict[str, float]]


class ModelEvaluation(BaseModel):
    mae: float
    rmse: float
    r2_score: float
    mape: float
    predictions: list[dict[str, float]]
