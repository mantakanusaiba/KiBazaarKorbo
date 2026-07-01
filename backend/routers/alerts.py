from fastapi import APIRouter
from pydantic import BaseModel
from services.alert_service import add_watch, remove_watch, list_watches, check_alerts, DEFAULT_THRESHOLD

router = APIRouter(tags=["alerts"])


class WatchRequest(BaseModel):
    client_id: str
    product: str
    threshold_pct: float = DEFAULT_THRESHOLD


@router.post("/alerts/watch")
def watch(payload: WatchRequest):
    return add_watch(payload.client_id, payload.product, payload.threshold_pct)


@router.delete("/alerts/watch/{client_id}/{product}")
def unwatch(client_id: str, product: str):
    return remove_watch(client_id, product)


@router.get("/alerts/watch/{client_id}")
def watches(client_id: str):
    return list_watches(client_id)


@router.get("/alerts/check/{client_id}")
def check(client_id: str):
    return check_alerts(client_id)
