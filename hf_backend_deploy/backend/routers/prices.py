from fastapi import APIRouter
from services.data_service import (
    get_latest_prices,
    get_price_history,
    get_market_comparison,
    get_products,
    refresh_data
)
from services.model_service import get_available_products

router = APIRouter(tags=["prices"])


def _forecastable_only(records_or_keys, key_fn=lambda r: r):
    """Drop anything the training pipeline removed entirely (see
    ml/train.py + model_service.get_available_products). Keeps the
    frontend from ever showing a product — on the dashboard, in a
    dropdown, anywhere — that has no working forecast model behind it."""
    allowed = set(get_available_products())
    return [r for r in records_or_keys if key_fn(r) in allowed]

@router.get("/prices/today")
def today():
    return _forecastable_only(get_latest_prices(), key_fn=lambda r: r.get("standard_key"))

@router.get("/prices/history/{product}")
def history(product: str, days: int = 90):
    return get_price_history(product, days)

@router.get("/prices/markets/{product}")
def market_compare(product: str):
    return get_market_comparison(product)

@router.get("/products")
def products():
    return _forecastable_only(get_products())

@router.post("/refresh")
def refresh():
    """
    Triggers a live pull of today's prices from the DAM API and merges
    them into the dataset immediately, so /prices/today reflects fresh
    data without restarting the server. Call this from a cron job or
    scheduler (e.g. once or twice a day) to keep the site current.
    """
    return refresh_data()