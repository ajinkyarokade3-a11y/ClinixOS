from pydantic import BaseModel, Field
from typing import Optional


class SupplyChainNode(BaseModel):
    id: str
    name: str
    node_type: str
    location: str
    x: float
    y: float


class SupplyChainEdge(BaseModel):
    from_node: str
    to_node: str
    transport_mode: str
    distance_km: float
    transit_time_hours: float


class SupplyChainGraph(BaseModel):
    nodes: list[SupplyChainNode]
    edges: list[SupplyChainEdge]


class BatchInfo(BaseModel):
    batch_id: str
    medicine_name: str
    raw_material_lot: str
    manufacturer: str
    production_date: str
    expiry_date: str
    quantity: int
    current_location: str


class ContaminationAlert(BaseModel):
    batch_id: str
    contaminated_lot: str
    contamination_type: str
    severity: str
    detected_at: str
    description: str


class TraversalResult(BaseModel):
    traversal_type: str
    start_node: str
    visited_order: list[str]
    discovery_depth: dict[str, int]
    predecessors: dict[str, Optional[str]]
    affected_nodes: list[str]
    traversal_tree: list[dict]


class RecallReport(BaseModel):
    alert_id: str
    batch_id: str
    contaminated_lot: str
    severity: str
    downstream_affected: list[str]
    upstream_trace: list[str]
    bfs_result: TraversalResult
    dfs_result: TraversalResult
    recommended_action: str
    generated_at: str
