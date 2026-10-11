from pydantic import BaseModel, Field


class VentilatorInput(BaseModel):
    spo2: float = Field(..., ge=70, le=100, description="SpO2 percentage (70-100)")
    respiration_rate: float = Field(..., ge=10, le=40, description="Respiration rate in breaths/min (10-40)")


class MembershipDegree(BaseModel):
    label: str
    degree: float


class ActivatedRule(BaseModel):
    rule_number: int
    description: str
    antecedent_degree: float
    consequent: str
    consequent_degree: float


class VentilatorOutput(BaseModel):
    oxygen_flow: float
    unit: str = "L/min"
    spo2_memberships: list[MembershipDegree]
    respiration_memberships: list[MembershipDegree]
    activated_rules: list[ActivatedRule]
    aggregated_output: list[dict[str, float]]
    defuzzification_method: str = "centroid"
    sample_input: dict[str, float] | None = None
