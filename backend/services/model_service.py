import pickle
import pandas as pd
import os
from functools import lru_cache
from services.data_service import load_data
from ml.feature_engineering import build_features, FEATURE_COLS

MODEL_PATH = os.getenv("MODEL_PATH", "ml/models/price_models.pkl")

@lru_cache(maxsize=1)
def load_models() -> dict:
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)

def predict_tomorrow(product: str) -> dict:
    models = load_models()
    if product not in models:
        return {"error": f"No model trained for '{product}'"}

    df = load_data()
    df_feat = build_features(df)
    latest_row = (
        df_feat[df_feat["standard_key"] == product]
        .dropna(subset=FEATURE_COLS)
        .tail(1)
    )

    if latest_row.empty:
        return {"error": "Not enough data to predict"}

    current_price = float(latest_row["avg_price"].values[0])
    predicted     = float(models[product].predict(latest_row[FEATURE_COLS])[0])
    change_pct    = ((predicted - current_price) / current_price) * 100

    return {
        "product":            product,
        "current_avg":        round(current_price, 2),
        "predicted_tomorrow": round(predicted, 2),
        "change_pct":         round(change_pct, 2),
        "direction": "increase" if change_pct > 2 else ("decrease" if change_pct < -2 else "stable")
    }
