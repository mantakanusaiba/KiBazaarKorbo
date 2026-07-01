from fastapi import APIRouter
from services.data_service import (
    get_latest_prices,
    get_price_history,
    get_market_comparison,
    get_products,
    refresh_data
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

@router.post("/refresh")
def refresh():
    """
    Triggers a live pull of today's prices from the DAM API and merges
    them into the dataset immediately, so /prices/today reflects fresh
    data without restarting the server. Call this from a cron job or
    scheduler (e.g. once or twice a day) to keep the site current.
    """
    return refresh_data()
