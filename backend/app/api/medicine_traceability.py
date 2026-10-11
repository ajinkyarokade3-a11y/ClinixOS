from fastapi import APIRouter, HTTPException
from app.schemas.medicine_traceability import (
    SupplyChainGraph, BatchInfo, ContaminationAlert,
    TraversalResult, RecallReport,
)
from app.services.batch_tracing import (
    build_supply_chain, get_batches, bfs_traversal,
    dfs_traversal, trace_upstream, generate_recall_report,
)

router = APIRouter(prefix="/api/traceability", tags=["Medicine Traceability"])


@router.get("/graph", response_model=SupplyChainGraph)
def get_graph() -> SupplyChainGraph:
    return build_supply_chain()


@router.get("/batches", response_model=list[BatchInfo])
def get_all_batches() -> list[BatchInfo]:
    return get_batches()


@router.get("/batches/{batch_id}", response_model=BatchInfo)
def get_batch(batch_id: str) -> BatchInfo:
    batches = get_batches()
    batch = next((b for b in batches if b.batch_id == batch_id), None)
    if batch is None:
        raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found")
    return batch


@router.post("/traverse/bfs", response_model=TraversalResult)
def traverse_bfs(start_node: str) -> TraversalResult:
    graph = build_supply_chain()
    node_ids = {n.id for n in graph.nodes}
    if start_node not in node_ids:
        raise HTTPException(status_code=404, detail=f"Node '{start_node}' not found in supply chain graph")
    return bfs_traversal(graph, start_node)


@router.post("/traverse/dfs", response_model=TraversalResult)
def traverse_dfs(start_node: str) -> TraversalResult:
    graph = build_supply_chain()
    node_ids = {n.id for n in graph.nodes}
    if start_node not in node_ids:
        raise HTTPException(status_code=404, detail=f"Node '{start_node}' not found in supply chain graph")
    return dfs_traversal(graph, start_node)


@router.get("/trace-upstream/{node_id}")
def trace_upstream_path(node_id: str) -> dict:
    graph = build_supply_chain()
    node_ids = {n.id for n in graph.nodes}
    if node_id not in node_ids:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")
    path = trace_upstream(graph, node_id)
    return {"target": node_id, "upstream_path": path}


@router.post("/recall", response_model=RecallReport)
def create_recall_report(alert: ContaminationAlert) -> RecallReport:
    graph = build_supply_chain()
    node_ids = {n.id for n in graph.nodes}
    if alert.contaminated_lot not in node_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Contaminated lot '{alert.contaminated_lot}' not found in supply chain graph",
        )
    return generate_recall_report(graph, alert)
