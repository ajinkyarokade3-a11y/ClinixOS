import heapq
import math
from app.schemas.ev_routing import RouteRequest, RouteResult, GraphNode, RoadSegment, ChargingStation


def build_graph(nodes: list[GraphNode], edges: list[RoadSegment]) -> dict:
    graph: dict[str, list[tuple[str, RoadSegment]]] = {n.id: [] for n in nodes}
    for edge in edges:
        graph[edge.from_node].append((edge.to_node, edge))
        graph[edge.to_node].append((edge.from_node, edge))
    return graph


def euclidean_distance(a: GraphNode, b: GraphNode) -> float:
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)


def energy_heuristic(current: GraphNode, goal: GraphNode,
                     base_consumption: float = 0.15) -> float:
    dist = euclidean_distance(current, goal)
    return dist * base_consumption


def calculate_edge_energy(edge: RoadSegment) -> float:
    base = edge.distance_km * 0.15
    elevation_factor = 1 + (edge.elevation_gain_m / max(edge.distance_km * 100, 1)) * 0.5
    traffic_factor = 1 + edge.traffic_density * 0.3
    return base * elevation_factor * traffic_factor


def astar_route(nodes: list[GraphNode], edges: list[RoadSegment],
                charging_stations: list[ChargingStation],
                request: RouteRequest) -> RouteResult:
    node_map = {n.id: n for n in nodes}
    if request.start_node not in node_map:
        return RouteResult(
            path=[], total_distance_km=0, total_energy_kwh=0,
            estimated_time_min=0, battery_at_destination=0,
            charging_stops=[], node_expansion_order=[],
            heuristic_explanation="", alternatives=[], reachable=False,
            error_message=f"Start node '{request.start_node}' not found in graph.",
        )
    if request.end_node not in node_map:
        return RouteResult(
            path=[], total_distance_km=0, total_energy_kwh=0,
            estimated_time_min=0, battery_at_destination=0,
            charging_stops=[], node_expansion_order=[],
            heuristic_explanation="", alternatives=[], reachable=False,
            error_message=f"Destination node '{request.end_node}' not found in graph.",
        )

    graph = build_graph(nodes, edges)
    start = request.start_node
    goal = request.end_node
    battery_cap = request.battery_capacity
    current_charge = min(request.current_charge, battery_cap)

    if current_charge <= 0:
        return RouteResult(
            path=[], total_distance_km=0, total_energy_kwh=0,
            estimated_time_min=0, battery_at_destination=0,
            charging_stops=[], node_expansion_order=[],
            heuristic_explanation="", alternatives=[], reachable=False,
            error_message="Insufficient battery charge to start.",
        )

    charging_node_ids = {cs.node_id for cs in charging_stations}

    open_set: list[tuple[float, float, str, float, list[str], list[dict]]] = []
    start_node = node_map[start]
    goal_node = node_map[goal]
    h_start = energy_heuristic(start_node, goal_node)
    heapq.heappush(open_set, (h_start, 0, start, current_charge, [start], []))

    g_score: dict[str, float] = {start: 0}
    visited_order: list[str] = []
    best_paths: list[dict] = []
    found_path = None

    while open_set:
        f, g, current, battery, path, stops = heapq.heappop(open_set)

        if current in visited_order:
            continue
        visited_order.append(current)

        if current == goal:
            found_path = (path, g, battery, stops)
            break

        for neighbor, edge in graph.get(current, []):
            edge_energy = calculate_edge_energy(edge)
            new_battery = battery - edge_energy

            if new_battery < 0:
                if current in charging_node_ids and battery < battery_cap * 0.9:
                    charge_needed = min(battery_cap - battery, edge_energy + 5)
                    new_battery = battery + charge_needed - edge_energy
                    new_stops = stops + [{"node": current, "charge_added": round(charge_needed, 2)}]
                else:
                    continue
            else:
                new_stops = stops

            if neighbor in charging_node_ids and new_battery < battery_cap * 0.5:
                charge_amount = battery_cap - new_battery
                new_battery = battery_cap
                new_stops = new_stops + [{"node": neighbor, "charge_added": round(charge_amount, 2)}]

            new_g = g + edge_energy
            h = energy_heuristic(node_map[neighbor], goal_node)
            f_score = new_g + h

            if neighbor not in g_score or new_g < g_score[neighbor]:
                g_score[neighbor] = new_g
                heapq.heappush(open_set, (f_score, new_g, neighbor, new_battery, path + [neighbor], new_stops))

    if found_path is None:
        return RouteResult(
            path=[], total_distance_km=0, total_energy_kwh=0,
            estimated_time_min=0, battery_at_destination=0,
            charging_stops=[], node_expansion_order=visited_order,
            heuristic_explanation="A* heuristic: Euclidean distance × base energy consumption rate (0.15 kWh/km). Admissible because actual cost ≥ straight-line estimate.",
            alternatives=[], reachable=False,
            error_message="No feasible route found. Destination may be unreachable with current battery capacity.",
        )

    path, total_energy, final_battery, stops = found_path
    total_distance = 0.0
    for i in range(len(path) - 1):
        for neighbor, edge in graph[path[i]]:
            if neighbor == path[i + 1]:
                total_distance += edge.distance_km
                break

    est_time = total_distance / 40 * 60
    for stop in stops:
        est_time += stop["charge_added"] / 50 * 60

    for alt_goal in [n.id for n in nodes if n.id not in (start, goal)][:3]:
        alt_result = _find_alt_path(nodes, edges, charging_stations, start, alt_goal, battery_cap, current_charge)
        if alt_result:
            best_paths.append(alt_result)

    return RouteResult(
        path=path,
        total_distance_km=round(total_distance, 2),
        total_energy_kwh=round(total_energy, 2),
        estimated_time_min=round(est_time, 1),
        battery_at_destination=round(final_battery, 2),
        charging_stops=stops,
        node_expansion_order=visited_order,
        heuristic_explanation="A* heuristic: Euclidean distance × base energy consumption rate (0.15 kWh/km). Admissible because actual cost ≥ straight-line estimate.",
        alternatives=best_paths,
        reachable=True,
    )


def _find_alt_path(nodes, edges, charging_stations, start, goal, battery_cap, current_charge) -> dict | None:
    node_map = {n.id: n for n in nodes}
    if goal not in node_map:
        return None
    graph = build_graph(nodes, edges)
    charging_node_ids = {cs.node_id for cs in charging_stations}

    open_set = [(0, start, current_charge, [start])]
    visited = set()

    while open_set:
        g, current, battery, path = heapq.heappop(open_set)
        if current in visited:
            continue
        visited.add(current)
        if current == goal:
            return {"destination": goal, "path": path, "energy_kwh": round(g, 2)}
        for neighbor, edge in graph.get(current, []):
            edge_energy = calculate_edge_energy(edge)
            new_battery = battery - edge_energy
            if new_battery < 0:
                if current in charging_node_ids:
                    new_battery = min(battery_cap, battery + edge_energy + 5) - edge_energy
                else:
                    continue
            heapq.heappush(open_set, (g + edge_energy, neighbor, new_battery, path + [neighbor]))
    return None
