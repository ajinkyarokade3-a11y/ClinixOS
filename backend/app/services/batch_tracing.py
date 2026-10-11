from collections import deque
from app.schemas.medicine_traceability import (
    SupplyChainNode, SupplyChainEdge, SupplyChainGraph,
    BatchInfo, ContaminationAlert, TraversalResult, RecallReport,
)


def build_supply_chain() -> SupplyChainGraph:
    nodes = [
        SupplyChainNode(id="RM1", name="RawMat Suppliers India", node_type="supplier", location="Mumbai", x=1, y=8),
        SupplyChainNode(id="RM2", name="PharmaChem Labs", node_type="supplier", location="Pune", x=1, y=6),
        SupplyChainNode(id="RM3", name="BioSource Materials", node_type="supplier", location="Nashik", x=1, y=4),
        SupplyChainNode(id="MFG1", name="Cipla Manufacturing", node_type="manufacturer", location="Goa", x=3, y=7),
        SupplyChainNode(id="MFG2", name="Sun Pharma Plant", node_type="manufacturer", location="Vadodara", x=3, y=5),
        SupplyChainNode(id="LAB1", name="QualityTest Labs", node_type="laboratory", location="Mumbai", x=5, y=6),
        SupplyChainNode(id="DC1", name="Central Distribution Hub", node_type="distribution", location="Delhi", x=7, y=7),
        SupplyChainNode(id="DC2", name="West Distribution Center", node_type="distribution", location="Mumbai", x=7, y=5),
        SupplyChainNode(id="DC3", name="South Distribution Center", node_type="distribution", location="Chennai", x=7, y=3),
        SupplyChainNode(id="PHR1", name="City Pharmacy Chain", node_type="pharmacy", location="Mumbai", x=9, y=6),
        SupplyChainNode(id="PHR2", name="MedPlus Pharmacy", node_type="pharmacy", location="Pune", x=9, y=5),
        SupplyChainNode(id="PHR3", name="Apollo Pharmacy", node_type="pharmacy", location="Chennai", x=9, y=3),
        SupplyChainNode(id="PHR4", name="Wellness Forever", node_type="pharmacy", location="Delhi", x=9, y=7),
        SupplyChainNode(id="HSP1", name="General Hospital Pharmacy", node_type="pharmacy", location="Delhi", x=11, y=7),
        SupplyChainNode(id="HSP2", name="City Hospital Pharmacy", node_type="pharmacy", location="Mumbai", x=11, y=5),
    ]

    edges = [
        SupplyChainEdge(from_node="RM1", to_node="MFG1", transport_mode="road", distance_km=120, transit_time_hours=3),
        SupplyChainEdge(from_node="RM2", to_node="MFG1", transport_mode="road", distance_km=95, transit_time_hours=2),
        SupplyChainEdge(from_node="RM2", to_node="MFG2", transport_mode="road", distance_km=110, transit_time_hours=3),
        SupplyChainEdge(from_node="RM3", to_node="MFG2", transport_mode="road", distance_km=80, transit_time_hours=2),
        SupplyChainEdge(from_node="MFG1", to_node="LAB1", transport_mode="road", distance_km=50, transit_time_hours=1),
        SupplyChainEdge(from_node="MFG2", to_node="LAB1", transport_mode="road", distance_km=60, transit_time_hours=1.5),
        SupplyChainEdge(from_node="LAB1", to_node="DC1", transport_mode="rail", distance_km=1400, transit_time_hours=24),
        SupplyChainEdge(from_node="LAB1", to_node="DC2", transport_mode="road", distance_km=15, transit_time_hours=0.5),
        SupplyChainEdge(from_node="LAB1", to_node="DC3", transport_mode="air", distance_km=1200, transit_time_hours=2),
        SupplyChainEdge(from_node="DC1", to_node="PHR4", transport_mode="road", distance_km=5, transit_time_hours=0.2),
        SupplyChainEdge(from_node="DC1", to_node="HSP1", transport_mode="road", distance_km=8, transit_time_hours=0.3),
        SupplyChainEdge(from_node="DC2", to_node="PHR1", transport_mode="road", distance_km=3, transit_time_hours=0.1),
        SupplyChainEdge(from_node="DC2", to_node="PHR2", transport_mode="road", distance_km=4, transit_time_hours=0.15),
        SupplyChainEdge(from_node="DC2", to_node="HSP2", transport_mode="road", distance_km=6, transit_time_hours=0.2),
        SupplyChainEdge(from_node="DC3", to_node="PHR3", transport_mode="road", distance_km=4, transit_time_hours=0.15),
    ]

    return SupplyChainGraph(nodes=nodes, edges=edges)


def get_batches() -> list[BatchInfo]:
    return [
        BatchInfo(batch_id="BAT-2026-001", medicine_name="Amoxicillin 500mg", raw_material_lot="RMX-2026-A01", manufacturer="Cipla Manufacturing", production_date="2026-01-15", expiry_date="2027-07-15", quantity=50000, current_location="DC2"),
        BatchInfo(batch_id="BAT-2026-002", medicine_name="Paracetamol 650mg", raw_material_lot="PCM-2026-B12", manufacturer="Sun Pharma Plant", production_date="2026-02-20", expiry_date="2027-08-20", quantity=100000, current_location="DC1"),
        BatchInfo(batch_id="BAT-2026-003", medicine_name="Insulin Glargine", raw_material_lot="INS-2026-C03", manufacturer="Cipla Manufacturing", production_date="2026-03-10", expiry_date="2026-09-10", quantity=5000, current_location="DC3"),
        BatchInfo(batch_id="BAT-2026-004", medicine_name="Metformin 500mg", raw_material_lot="MET-2026-D07", manufacturer="Sun Pharma Plant", production_date="2026-04-05", expiry_date="2027-10-05", quantity=75000, current_location="DC2"),
        BatchInfo(batch_id="BAT-2026-005", medicine_name="Azithromycin 250mg", raw_material_lot="AZI-2026-F02", manufacturer="Cipla Manufacturing", production_date="2026-05-12", expiry_date="2027-11-12", quantity=30000, current_location="DC1"),
    ]


def bfs_traversal(graph: SupplyChainGraph, start_node: str) -> TraversalResult:
    adj: dict[str, list[str]] = {n.id: [] for n in graph.nodes}
    for edge in graph.edges:
        adj[edge.from_node].append(edge.to_node)

    visited_order: list[str] = []
    depth: dict[str, int] = {}
    predecessors: dict[str, str | None] = {}
    tree: list[dict] = []
    queue = deque([(start_node, 0, None)])
    visited = {start_node}

    while queue:
        node, d, pred = queue.popleft()
        visited_order.append(node)
        depth[node] = d
        predecessors[node] = pred
        tree.append({"node": node, "depth": d, "predecessor": pred})
        for neighbor in adj.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, d + 1, node))

    return TraversalResult(
        traversal_type="BFS",
        start_node=start_node,
        visited_order=visited_order,
        discovery_depth=depth,
        predecessors=predecessors,
        affected_nodes=visited_order[1:],
        traversal_tree=tree,
    )


def dfs_traversal(graph: SupplyChainGraph, start_node: str) -> TraversalResult:
    adj: dict[str, list[str]] = {n.id: [] for n in graph.nodes}
    for edge in graph.edges:
        adj[edge.from_node].append(edge.to_node)

    visited_order: list[str] = []
    depth: dict[str, int] = {}
    predecessors: dict[str, str | None] = {}
    tree: list[dict] = []
    visited = set()

    def dfs(node: str, d: int, pred: str | None):
        if node in visited:
            return
        visited.add(node)
        visited_order.append(node)
        depth[node] = d
        predecessors[node] = pred
        tree.append({"node": node, "depth": d, "predecessor": pred})
        for neighbor in adj.get(node, []):
            dfs(neighbor, d + 1, node)

    dfs(start_node, 0, None)

    return TraversalResult(
        traversal_type="DFS",
        start_node=start_node,
        visited_order=visited_order,
        discovery_depth=depth,
        predecessors=predecessors,
        affected_nodes=visited_order[1:],
        traversal_tree=tree,
    )


def trace_upstream(graph: SupplyChainGraph, target_node: str) -> list[str]:
    reverse_adj: dict[str, list[str]] = {n.id: [] for n in graph.nodes}
    for edge in graph.edges:
        reverse_adj[edge.to_node].append(edge.from_node)

    visited = set()
    path: list[str] = []
    queue = deque([target_node])
    visited.add(target_node)

    while queue:
        node = queue.popleft()
        path.append(node)
        for pred in reverse_adj.get(node, []):
            if pred not in visited:
                visited.add(pred)
                queue.append(pred)

    return path


def generate_recall_report(graph: SupplyChainGraph, alert: ContaminationAlert) -> RecallReport:
    bfs = bfs_traversal(graph, alert.contaminated_lot)
    dfs = dfs_traversal(graph, alert.contaminated_lot)
    upstream = trace_upstream(graph, alert.contaminated_lot)

    severity_actions = {
        "low": "Monitor and test affected batches. No immediate recall required.",
        "medium": "Quarantine affected batches. Initiate targeted recall from distribution centers.",
        "high": "Immediate full recall of all downstream batches. Notify regulatory authorities.",
        "critical": "Emergency recall. Halt all distribution. Issue public safety alert.",
    }

    return RecallReport(
        alert_id=f"ALERT-{alert.batch_id}",
        batch_id=alert.batch_id,
        contaminated_lot=alert.contaminated_lot,
        severity=alert.severity,
        downstream_affected=bfs.affected_nodes,
        upstream_trace=upstream,
        bfs_result=bfs,
        dfs_result=dfs,
        recommended_action=severity_actions.get(alert.severity, "Evaluate and take appropriate action."),
        generated_at="2026-10-11T10:00:00Z",
    )
