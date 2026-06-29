from fastapi import APIRouter
from services.model_service import predict_tomorrow
from services.advice_engine import get_advice
from services.llm_service import explain_forecast

router = APIRouter(tags=["explain"])

@router.get("/explain/{product}")
def explain(product: str):
    forecast = predict_tomorrow(product)
    if "error" in forecast:
        return forecast

    advice = get_advice(forecast["direction"], forecast["change_pct"])

    explanation = explain_forecast(
        product_en=product,
        current_price=forecast["current_avg"],
        predicted_price=forecast["predicted_tomorrow"],
        direction=forecast["direction"],
        advice=advice["advice"]
    )

    return {
        **forecast,
        **advice,
        "explanation": explanation
    }
