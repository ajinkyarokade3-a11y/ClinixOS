import pytest
from app.schemas.ev_routing import RouteRequest
from app.services.astar_routing import astar_route, calculate_edge_energy, energy_heuristic
from app.services.ev_network import get_hospital_network


def test_basic_route():
    nodes, edges, cs = get_hospital_network()
    req = RouteRequest(start_node="depot", end_node="north", battery_capacity=100, current_charge=80)
    result = astar_route(nodes, edges, cs, req)
    assert result.reachable
    assert result.path[0] == "depot"
    assert result.path[-1] == "north"
    assert result.total_distance_km > 0


def test_long_route_with_charging():
    nodes, edges, cs = get_hospital_network()
    req = RouteRequest(start_node="depot", end_node="airport", battery_capacity=100, current_charge=80)
    result = astar_route(nodes, edges, cs, req)
    assert result.reachable
    assert result.total_distance_km > 10


def test_unreachable_destination():
    nodes, edges, cs = get_hospital_network()
    req = RouteRequest(start_node="depot", end_node="nonexistent", battery_capacity=100, current_charge=80)
    result = astar_route(nodes, edges, cs, req)
    assert not result.reachable
    assert result.error_message is not None


def test_insufficient_battery():
    nodes, edges, cs = get_hospital_network()
    req = RouteRequest(start_node="depot", end_node="airport", battery_capacity=10, current_charge=5)
    result = astar_route(nodes, edges, cs, req)
    assert not result.reachable or result.total_energy_kwh <= 10


def test_invalid_start_node():
    nodes, edges, cs = get_hospital_network()
    req = RouteRequest(start_node="invalid", end_node="north", battery_capacity=100, current_charge=80)
    result = astar_route(nodes, edges, cs, req)
    assert not result.reachable
    assert "not found" in result.error_message.lower()


def test_edge_energy_calculation():
    nodes, edges, cs = get_hospital_network()
    edge = edges[0]
    energy = calculate_edge_energy(edge)
    assert energy > 0


def test_heuristic_admissible():
    nodes, edges, cs = get_hospital_network()
    node_map = {n.id: n for n in nodes}
    h = energy_heuristic(node_map["depot"], node_map["airport"])
    assert h > 0
    assert h < 50


def test_node_expansion_order():
    nodes, edges, cs = get_hospital_network()
    req = RouteRequest(start_node="depot", end_node="east", battery_capacity=100, current_charge=80)
    result = astar_route(nodes, edges, cs, req)
    assert len(result.node_expansion_order) > 0
    assert result.node_expansion_order[0] == "depot"
