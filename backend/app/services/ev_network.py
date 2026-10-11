from app.schemas.ev_routing import GraphNode, RoadSegment, ChargingStation


def get_hospital_network() -> tuple[list[GraphNode], list[RoadSegment], list[ChargingStation]]:
    nodes = [
        GraphNode(id="depot", name="Central Hospital Depot", x=0, y=0, is_charging_station=True),
        GraphNode(id="north", name="City Clinic — North Wing", x=3, y=4),
        GraphNode(id="mall", name="Charging Station — Mall Road", x=7, y=2, is_charging_station=True),
        GraphNode(id="east", name="General Hospital — East", x=10, y=5),
        GraphNode(id="childrens", name="Children's Hospital", x=14, y=3),
        GraphNode(id="highway", name="Charging Station — Highway 44", x=18, y=6, is_charging_station=True),
        GraphNode(id="west", name="Westside Medical Center", x=5, y=-3),
        GraphNode(id="south", name="South District Hospital", x=8, y=-5),
        GraphNode(id="university", name="University Hospital", x=12, y=-2),
        GraphNode(id="airport", name="Airport Medical Facility", x=20, y=0),
    ]

    edges = [
        RoadSegment(from_node="depot", to_node="north", distance_km=5.0, elevation_gain_m=20, traffic_density=0.3, energy_consumption_kwh=0.8),
        RoadSegment(from_node="depot", to_node="west", distance_km=5.8, elevation_gain_m=10, traffic_density=0.2, energy_consumption_kwh=0.9),
        RoadSegment(from_node="north", to_node="mall", distance_km=4.5, elevation_gain_m=15, traffic_density=0.5, energy_consumption_kwh=0.7),
        RoadSegment(from_node="north", to_node="east", distance_km=7.2, elevation_gain_m=30, traffic_density=0.6, energy_consumption_kwh=1.1),
        RoadSegment(from_node="mall", to_node="east", distance_km=3.2, elevation_gain_m=5, traffic_density=0.4, energy_consumption_kwh=0.5),
        RoadSegment(from_node="mall", to_node="childrens", distance_km=7.1, elevation_gain_m=25, traffic_density=0.5, energy_consumption_kwh=1.0),
        RoadSegment(from_node="east", to_node="childrens", distance_km=4.1, elevation_gain_m=10, traffic_density=0.3, energy_consumption_kwh=0.6),
        RoadSegment(from_node="east", to_node="highway", distance_km=8.0, elevation_gain_m=40, traffic_density=0.7, energy_consumption_kwh=1.3),
        RoadSegment(from_node="childrens", to_node="highway", distance_km=4.5, elevation_gain_m=20, traffic_density=0.4, energy_consumption_kwh=0.7),
        RoadSegment(from_node="childrens", to_node="university", distance_km=5.5, elevation_gain_m=15, traffic_density=0.3, energy_consumption_kwh=0.8),
        RoadSegment(from_node="west", to_node="south", distance_km=8.5, elevation_gain_m=35, traffic_density=0.4, energy_consumption_kwh=1.2),
        RoadSegment(from_node="west", to_node="mall", distance_km=6.0, elevation_gain_m=20, traffic_density=0.5, energy_consumption_kwh=0.9),
        RoadSegment(from_node="south", to_node="university", distance_km=4.2, elevation_gain_m=10, traffic_density=0.2, energy_consumption_kwh=0.6),
        RoadSegment(from_node="south", to_node="highway", distance_km=10.5, elevation_gain_m=50, traffic_density=0.6, energy_consumption_kwh=1.5),
        RoadSegment(from_node="university", to_node="highway", distance_km=6.5, elevation_gain_m=25, traffic_density=0.4, energy_consumption_kwh=0.9),
        RoadSegment(from_node="university", to_node="airport", distance_km=8.2, elevation_gain_m=30, traffic_density=0.5, energy_consumption_kwh=1.2),
        RoadSegment(from_node="highway", to_node="airport", distance_km=2.5, elevation_gain_m=5, traffic_density=0.3, energy_consumption_kwh=0.4),
    ]

    charging_stations = [
        ChargingStation(node_id="depot", name="Central Depot Charger", charging_rate_kw=50),
        ChargingStation(node_id="mall", name="Mall Road Charger", charging_rate_kw=120),
        ChargingStation(node_id="highway", name="Highway 44 Charger", charging_rate_kw=150),
    ]

    return nodes, edges, charging_stations
