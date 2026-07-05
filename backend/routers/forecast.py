from fastapi import APIRouter, Query
from services.model_service import predict_tomorrow, predict_range

import math
from datetime import date, datetime

import numpy as np
import pandas as pd


router = APIRouter(tags=["forecast"])


def make_json_safe(value):
    """
    FastAPI JSON response cannot contain NaN, Infinity, pandas NA, numpy values, etc.
    This function converts unsafe values into normal JSON-safe Python values.
    """

    if value is None:
        return None

    # pandas missing values: pd.NA, pd.NaT, np.nan
    try:
        if pd.isna(value) and not isinstance(value, (list, tuple, dict, set)):
            return None
    except Exception:
        pass

    if isinstance(value, dict):
        return {str(k): make_json_safe(v) for k, v in value.items()}

    if isinstance(value, list):
        return [make_json_safe(v) for v in value]

    if isinstance(value, tuple):
        return [make_json_safe(v) for v in value]

    if isinstance(value, set):
        return [make_json_safe(v) for v in value]

    if isinstance(value, (datetime, date, pd.Timestamp)):
        return value.isoformat()

    if isinstance(value, np.integer):
        return int(value)

    if isinstance(value, np.floating):
        value = float(value)

    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value

    return value


@router.get("/forecast/{product}")
def forecast_week(
    product: str,
    market: str = Query(..., description="Market key, e.g. 'kawran_bazar'"),
    days: int = Query(7, description="Forecast horizon: 5 or 7 days"),
):
    """Weather-aware, weekend/festival-aware, per-market 5 or 7-day forecast."""

    result = predict_range(product, market, days)

    return make_json_safe(result)


@router.get("/forecast/{product}/tomorrow")
def forecast_tomorrow(
    product: str,
    market: str = Query(..., description="Market key, e.g. 'kawran_bazar'"),
):
    """Backward-compatible single-day forecast."""

    result = predict_tomorrow(product, market)

    return make_json_safe(result)