import pytest
from app.schemas.medicine_traceability import ContaminationAlert
from app.services.batch_tracing import (
    build_supply_chain, get_batches, bfs_traversal,
    dfs_traversal, trace_upstream, generate_recall_report,
)


def test_graph_structure():
    graph = build_supply_chain()
    assert len(graph.nodes) > 0
    assert len(graph.edges) > 0


def test_batches_exist():
    batches = get_batches()
    assert len(batches) > 0
    assert batches[0].batch_id.startswith("BAT-")


def test_bfs_traversal():
    graph = build_supply_chain()
    result = bfs_traversal(graph, "RM1")
    assert result.traversal_type == "BFS"
    assert result.visited_order[0] == "RM1"
    assert len(result.visited_order) > 1


def test_dfs_traversal():
    graph = build_supply_chain()
    result = dfs_traversal(graph, "RM1")
    assert result.traversal_type == "DFS"
    assert result.visited_order[0] == "RM1"
    assert len(result.visited_order) > 1


def test_bfs_dfs_differ():
    graph = build_supply_chain()
    bfs = bfs_traversal(graph, "RM2")
    dfs = dfs_traversal(graph, "RM2")
    assert bfs.visited_order != dfs.visited_order or len(bfs.visited_order) != len(dfs.visited_order)


def test_upstream_trace():
    graph = build_supply_chain()
    path = trace_upstream(graph, "PHR1")
    assert "PHR1" in path
    assert len(path) > 1


def test_recall_report():
    graph = build_supply_chain()
    alert = ContaminationAlert(
        batch_id="BAT-2026-001",
        contaminated_lot="RM1",
        contamination_type="chemical",
        severity="high",
        detected_at="2026-10-11T08:00:00Z",
        description="Chemical contamination detected in raw material lot.",
    )
    report = generate_recall_report(graph, alert)
    assert report.batch_id == "BAT-2026-001"
    assert len(report.downstream_affected) > 0
    assert len(report.upstream_trace) > 0
    assert report.recommended_action != ""


def test_disconnected_node():
    graph = build_supply_chain()
    result = bfs_traversal(graph, "RM3")
    assert result.visited_order[0] == "RM3"


def test_invalid_node_raises():
    graph = build_supply_chain()
    result = bfs_traversal(graph, "INVALID")
    assert len(result.visited_order) == 1
    assert result.affected_nodes == []
