from fastapi import APIRouter, HTTPException
from app.schemas.ev_routing import RouteRequest, RouteResult, GraphData
from app.services.astar_routing import astar_route
from app.services.ev_network import get_hospital_network

router = APIRouter(prefix="/api/ev-routing", tags=["EV Route Optimizer"])


@router.get("/graph", response_model=GraphData)
def get_graph() -> GraphData:
    nodes, edges, charging_stations = get_hospital_network()
    return GraphData(nodes=nodes, edges=edges, charging_stations=charging_stations)


@router.post("/route", response_model=RouteResult)
def calculate_route(request: RouteRequest) -> RouteResult:
    try:
        nodes, edges, charging_stations = get_hospital_network()
        result = astar_route(nodes, edges, charging_stations, request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Routing error: {str(e)}")
