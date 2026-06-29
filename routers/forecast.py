from fastapi import APIRouter
from services.model_service import predict_tomorrow

router = APIRouter(tags=["forecast"])

@router.get("/forecast/{product}")
def forecast(product: str):
    return predict_tomorrow(product)
