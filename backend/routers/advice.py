from fastapi import APIRouter
from pydantic import BaseModel
from services.advice_engine import fair_price_check
from services.data_service import load_data

router = APIRouter(tags=["advice"])

class FairPriceRequest(BaseModel):
    product: str
    paid_price: float

@router.post("/fair-price-check")
def check(req: FairPriceRequest):
    df = load_data()
    latest = df[df["standard_key"] == req.product]
    if latest.empty:
        return {"error": "Product not found"}
    latest_day   = latest[latest["date"] == latest["date"].max()]
    official_min = float(latest_day["min_price"].mean())
    official_max = float(latest_day["max_price"].mean())
    return {
        "product":      req.product,
        "paid":         req.paid_price,
        "official_min": round(official_min, 2),
        "official_max": round(official_max, 2),
        **fair_price_check(req.paid_price, official_min, official_max)
    }
