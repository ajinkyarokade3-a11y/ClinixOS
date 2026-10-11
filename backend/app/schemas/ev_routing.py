from pydantic import BaseModel, Field
from typing import Optional


class RouteRequest(BaseModel):
    start_node: str = Field(..., min_length=1, description="Start node ID")
    end_node: str = Field(..., min_length=1, description="Destination node ID")
    battery_capacity: float = Field(..., ge=10, le=500, description="Battery capacity in kWh")
    current_charge: float = Field(..., ge=0, le=500, description="Current charge in kWh")


class RoadSegment(BaseModel):
    from_node: str
    to_node: str
    distance_km: float
    elevation_gain_m: float
    traffic_density: float = Field(..., ge=0, le=1)
    energy_consumption_kwh: float


class ChargingStation(BaseModel):
    node_id: str
    name: str
    charging_rate_kw: float


class GraphNode(BaseModel):
    id: str
    name: str
    x: float
    y: float
    is_charging_station: bool = False


class RouteResult(BaseModel):
    path: list[str]
    total_distance_km: float
    total_energy_kwh: float
    estimated_time_min: float
    battery_at_destination: float
    charging_stops: list[dict]
    node_expansion_order: list[str]
    heuristic_explanation: str
    alternatives: list[dict]
    reachable: bool
    error_message: Optional[str] = None


class GraphData(BaseModel):
    nodes: list[GraphNode]
    edges: list[RoadSegment]
    charging_stations: list[ChargingStation]
