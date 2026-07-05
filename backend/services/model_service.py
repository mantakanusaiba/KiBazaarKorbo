import pickle
import pandas as pd
import os
from functools import lru_cache
from services.data_service import load_data
from ml.feature_engineering import build_features, build_weather_climatology, FEATURE_COLS
from ml.calendar_bd import is_weekend_bd, is_festival_bd, add_days_to_festival
from ml.explain_utils import top_factors as compute_top_factors

MODEL_PATH = os.getenv("MODEL_PATH", "ml/models/price_models.pkl")

VALID_HORIZONS = (5, 7)

# build_features()/build_weather_climatology() both scan the FULL price
# history (every product, every market) — they don't take `product`/
# `market` as filters. predict_range() used to call them fresh on every
# single invocation, so a basket with N items (the basket optimizer calls
# predict_tomorrow once per item) redid this same whole-dataset work N
# times per request, adding real latency on top of the LLM call. Caching
# by the underlying dataframe's id() means it's rebuilt only when
# load_data() actually re-reads the CSV (mtime change), not on every
# forecast call.
_feature_cache: dict = {"key": None, "df_feat": None, "clim": None}


def _get_engineered(df: pd.DataFrame):
    key = id(df)
    if _feature_cache["key"] != key:
        _feature_cache["key"] = key
        _feature_cache["df_feat"] = build_features(df)
        _feature_cache["clim"] = build_weather_climatology(df)
    return _feature_cache["df_feat"], _feature_cache["clim"]

# Models are trained with objective="reg:quantileerror",
# quantile_alpha=[0.1, 0.5, 0.9] (see ml/train.py), so a single model's
# .predict() returns a (1, 3) array: [P10, P50, P90] instead of one
# number. P50 is the point forecast used everywhere the app previously
# used a plain prediction; P10/P90 give every forecast a real
# uncertainty band instead of a fake-precise single figure.
Q_LOW, Q_MID, Q_HIGH = 0, 1, 2


def _predict_quantiles(model, row: pd.DataFrame) -> tuple[float, float, float]:
    pred = model.predict(row[FEATURE_COLS])[0]
    # Guard against any legacy single-output model still on disk.
    if getattr(pred, "shape", None) == () or isinstance(pred, float):
        p = float(pred)
        return p, p, p
    lo, mid, hi = float(pred[Q_LOW]), float(pred[Q_MID]), float(pred[Q_HIGH])
    lo, hi = min(lo, hi), max(lo, hi)  # safety: quantiles can cross slightly
    return lo, mid, hi


@lru_cache(maxsize=1)
def load_models() -> dict:
    """Returns {product: {horizon_int: fitted_model}}.
    One model per product per horizon — market is a *feature* inside each
    model (market_code), not a separate model. This avoids needing enough
    history per individual market to train a standalone model."""
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def get_available_products() -> list[str]:
    """Products the frontend is allowed to offer anywhere (dropdowns,
    dashboard listings, etc.).

    Keep every product that has AT LEAST ONE working horizon model,
    however many horizons it has. A product is excluded only when it
    has ZERO working horizons — i.e. it never made it into
    price_models.pkl at all, because every single horizon failed QA
    and ml/train.py deleted it from the models dict entirely (see
    remove_product()/REMOVED_OUT in ml/train.py).

    This deliberately does NOT require horizons 1-5 to all be present.
    predict_range() already handles a product with fewer horizons
    gracefully — it just returns however many days it has (see
    horizons_to_use in predict_range) instead of erroring out. So a
    product with only 1-3 working horizons still gives a useful partial
    forecast and should stay visible, not just ones with a full 5-day
    forecast.
    """
    return sorted(load_models().keys())


def predict_tomorrow(product: str, market: str | None = None) -> dict:
    """Kept for backward compatibility with the old single-day endpoint.
    Internally just calls predict_range for 1 day."""
    result = predict_range(product, market, days=7)
    if "error" in result:
        return result
    day1 = result["forecast"][0]
    return {
        "product": product,
        "market": result["market"],
        "current_avg": result["current_avg"],
        "predicted_tomorrow": day1["predicted_price"],
        "predicted_low": day1["predicted_low"],
        "predicted_high": day1["predicted_high"],
        "change_pct": day1["change_pct"],
        "direction": "increase" if day1["change_pct"] > 2 else (
            "decrease" if day1["change_pct"] < -2 else "stable"
        ),
        "top_factors": day1["top_factors"],

        # Expose the deterministic future context so the AI explanation can
        # discuss weather + festival/weekend impact on the forecast page.
        "is_weekend": day1.get("is_weekend", False),
        "is_festival": day1.get("is_festival", False),
        "rainfall_mm": day1.get("rainfall_mm"),
        "temp_avg_c": day1.get("temp_avg_c"),
    }


def predict_range(product: str, market: str, days: int = 7) -> dict:
    """
    Weather-aware, weekend/festival-aware, location-correct multi-day
    forecast.

    - `market` pins the forecast to one location. Weather for future days
      is filled from THAT market's own day-of-year climatology, never a
      global average, so forecasts stay location-correct.
    - is_weekend / is_festival / days_to_festival for future days are
      computed deterministically from the calendar (shared with training
      via ml.calendar_bd), not guessed.
    - days must be 5 or 7. Internally we always train up to 7 horizons;
      a 5-day request just returns the first 5.
    """
    if days not in VALID_HORIZONS:
        return {"error": f"days must be one of {VALID_HORIZONS}"}

    models = load_models()
    if product not in models or not models[product]:
        return {"error": f"No trained model for product '{product}'"}

    df = load_data()

    if market not in df["market"].unique():
        return {"error": f"Unknown market '{market}'"}

    df_feat, clim = _get_engineered(df)

    hist = df_feat[
        (df_feat["standard_key"] == product) & (df_feat["market"] == market)
    ]
    latest_row = hist.dropna(subset=FEATURE_COLS).sort_values("date").tail(1)

    if latest_row.empty:
        return {"error": f"Not enough history for '{product}' in '{market}' to forecast"}

    current_price = float(latest_row["avg_price"].values[0])
    last_date = pd.Timestamp(latest_row["date"].values[0])
    market_code = float(latest_row["market_code"].values[0])

    available_horizons = sorted(models[product].keys())
    horizons_to_use = [h for h in available_horizons if h <= days]

    if not horizons_to_use:
        return {"error": f"No trained horizons <= {days} for '{product}'"}

    forecast = []
    for h in horizons_to_use:
        target_date = last_date + pd.Timedelta(days=h)
        doy = target_date.dayofyear

        # Location-correct weather: this market's own seasonal average,
        # not a cross-market/global average.
        wx = clim[(clim["market"] == market) & (clim["doy"] == doy)]
        if not wx.empty:
            rainfall = float(wx["rainfall_mm"].values[0])
            temp = float(wx["temp_avg_c"].values[0])
        else:
            # fallback: persist the last known reading for this market
            rainfall = float(latest_row["rainfall_mm"].values[0])
            temp = float(latest_row["temp_avg_c"].values[0])

        row = latest_row.copy()
        row["rainfall_mm"] = rainfall
        row["temp_avg_c"] = temp
        row["day_of_week"] = target_date.dayofweek
        row["month"] = target_date.month
        row["is_weekend"] = is_weekend_bd(target_date)
        row["is_festival"] = is_festival_bd(target_date)
        row["market_code"] = market_code

        # days_to_festival for the target date itself
        tmp = pd.DataFrame({"date": [target_date]})
        tmp = add_days_to_festival(tmp, date_col="date")
        row["days_to_festival"] = int(tmp["days_to_festival"].values[0])

        model = models[product][h]
        low, pred, high = _predict_quantiles(model, row)
        change_pct = ((pred - current_price) / current_price) * 100

        forecast.append({
            "date": target_date.strftime("%Y-%m-%d"),
            "day": h,
            "predicted_price": round(pred, 2),
            "predicted_low": round(low, 2),
            "predicted_high": round(high, 2),
            "change_pct": round(change_pct, 2),
            "is_weekend": bool(is_weekend_bd(target_date)),
            "is_festival": bool(is_festival_bd(target_date)),
            "rainfall_mm": round(rainfall, 1),
            "temp_avg_c": round(temp, 1),
            "top_factors": compute_top_factors(model, row) if h == horizons_to_use[0] else [],
        })

    return {
        "product": product,
        "market": market,
        "current_avg": round(current_price, 2),
        "horizon_days": days,
        "forecast": forecast,
    }