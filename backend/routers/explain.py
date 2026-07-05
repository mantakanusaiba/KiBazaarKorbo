from fastapi import APIRouter
from services.model_service import predict_tomorrow
from services.advice_engine import get_advice
from services.llm_service import explain_forecast
from services.data_service import get_default_market

router = APIRouter(tags=["explain"])


@router.get("/explain/{product}")
def explain(product: str):
    market = get_default_market(product)
    if market is None:
        return {"error": f"No data for product '{product}'"}

    forecast = predict_tomorrow(product, market)
    if "error" in forecast:
        return forecast

    advice = get_advice(forecast["direction"], forecast["change_pct"])

    explanation = explain_forecast(
        product_en=product,
        current_price=forecast["current_avg"],
        predicted_price=forecast["predicted_tomorrow"],
        direction=forecast["direction"],
        advice=advice["advice"],
        market=forecast.get("market"),
        change_pct=forecast.get("change_pct"),
        is_festival=forecast.get("is_festival", False),
        is_weekend=forecast.get("is_weekend", False),
        rainfall_mm=forecast.get("rainfall_mm"),
        temp_avg_c=forecast.get("temp_avg_c"),
        top_factors=forecast.get("top_factors"),
    )

    return {
        **forecast,
        **advice,
        "explanation": explanation,
    }
