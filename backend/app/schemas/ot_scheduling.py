from pydantic import BaseModel, Field


class OTSchedulingInput(BaseModel):
    surgical_urgency: float = Field(..., ge=1, le=10, description="Surgical urgency (1-10)")
    surgeon_workload: float = Field(..., ge=0, le=100, description="Surgeon workload/fatigue (0-100%)")
    icu_capacity: float = Field(..., ge=0, le=100, description="Available postoperative ICU capacity (0-100%)")


class MamdaniMembership(BaseModel):
    label: str
    degree: float


class MamdaniRule(BaseModel):
    rule_number: int
    description: str
    antecedent_degree: float
    risk_level: str
    risk_degree: float


class MamdaniOutput(BaseModel):
    risk_score: float
    scheduling_action: str
    urgency_memberships: list[MamdaniMembership]
    workload_memberships: list[MamdaniMembership]
    icu_memberships: list[MamdaniMembership]
    activated_rules: list[MamdaniRule]
    defuzzification_method: str = "centroid"


class SugenoRule(BaseModel):
    rule_number: int
    description: str
    antecedent_degree: float
    output_value: float
    weight: float


class SugenoOutput(BaseModel):
    buffer_extension: float
    unit: str = "minutes"
    activated_rules: list[SugenoRule]
    defuzzification_method: str = "weighted_average"


class SurgicalWorkflow(BaseModel):
    id: int
    surgical_urgency: float
    surgeon_workload: float
    icu_capacity: float
    mamdani_risk: float
    mamdani_action: str
    sugeno_buffer: float


class SimulationSummary(BaseModel):
    total_workflows: int
    action_breakdown: dict[str, int]
    risk_distribution: dict[str, int]
    avg_buffer_extension: float
    avg_risk_score: float
