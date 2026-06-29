from fastapi import APIRouter
from services.data_service import (
    get_latest_prices,
    get_price_history,
    get_market_comparison,
    get_products
)

router = APIRouter(tags=["prices"])

@router.get("/prices/today")
def today():
    return get_latest_prices()

@router.get("/prices/history/{product}")
def history(product: str, days: int = 90):
    return get_price_history(product, days)

@router.get("/prices/markets/{product}")
def market_compare(product: str):
    return get_market_comparison(product)

@router.get("/products")
def products():
    return get_products()
