"""
Turns a raw XGBoost prediction into a ranked list of the actual features
that drove it, using SHAP (TreeExplainer). This replaces guesswork in the
LLM explanation layer: instead of an LLM inferring "probably the rain"
from a hand-picked set of facts, we tell it *exactly* which features the
model itself leaned on for this specific prediction, ranked by magnitude.

Kept separate from model_service.py so the SHAP dependency and the
human-readable label mapping live in one place.
"""
from functools import lru_cache

import numpy as np
import pandas as pd
import shap

from ml.feature_engineering import FEATURE_COLS

# Bilingual, human-readable labels per feature — used to turn a raw
# column name like "avg_ma7" into something a shopper (or the Bangla LLM
# prompt) can actually understand.
FEATURE_LABELS = {
    "avg_lag1":          {"en": "yesterday's price",            "bn": "গতকালের দাম"},
    "avg_lag3":          {"en": "price 3 days ago",              "bn": "৩ দিন আগের দাম"},
    "avg_lag7":          {"en": "price a week ago",              "bn": "এক সপ্তাহ আগের দাম"},
    "avg_ma7":           {"en": "7-day average price",           "bn": "৭ দিনের গড় দাম"},
    "avg_ma30":          {"en": "30-day average price",          "bn": "৩০ দিনের গড় দাম"},
    "price_change_1d":   {"en": "recent 1-day price momentum",   "bn": "সাম্প্রতিক ১ দিনের দাম পরিবর্তনের প্রবণতা"},
    "price_change_7d":   {"en": "recent 7-day price momentum",   "bn": "সাম্প্রতিক ৭ দিনের দাম পরিবর্তনের প্রবণতা"},
    "rainfall_mm":       {"en": "current rainfall",              "bn": "বর্তমান বৃষ্টিপাত"},
    "temp_avg_c":        {"en": "current temperature",           "bn": "বর্তমান তাপমাত্রা"},
    "rainfall_mm_ma7":   {"en": "7-day average rainfall",        "bn": "৭ দিনের গড় বৃষ্টিপাত"},
    "temp_avg_c_ma7":    {"en": "7-day average temperature",     "bn": "৭ দিনের গড় তাপমাত্রা"},
    "rainfall_7d_total": {"en": "total rainfall this week",      "bn": "এই সপ্তাহের মোট বৃষ্টিপাত"},
    "day_of_week":       {"en": "day of the week",               "bn": "সপ্তাহের দিন"},
    "month":             {"en": "seasonal (monthly) pattern",    "bn": "মৌসুমি (মাসিক) প্রবণতা"},
    "is_weekend":        {"en": "weekend demand pattern",        "bn": "সাপ্তাহিক ছুটির চাহিদার ধরন"},
    "is_festival":       {"en": "festival/holiday demand",       "bn": "উৎসব/ছুটির চাহিদা"},
    "days_to_festival":  {"en": "days until the next festival",  "bn": "পরবর্তী উৎসব পর্যন্ত দিন"},
    "market_code":       {"en": "this specific market's pricing habits", "bn": "এই নির্দিষ্ট বাজারের দামের ধরন"},
}

P50_OUTPUT_INDEX = 1  # quantile_alpha=[0.1, 0.5, 0.9] -> index 1 is the median model


@lru_cache(maxsize=64)
def _get_explainer(model_id: int, model):
    """One TreeExplainer per fitted model, cached by id() so repeated
    forecasts for the same product/horizon don't rebuild it every request."""
    return shap.TreeExplainer(model)


def top_factors(model, row: pd.DataFrame, top_n: int = 3) -> list[dict]:
    """
    Returns the top_n features (by |SHAP value|) that pushed this specific
    prediction up or down, e.g.:
        [{"feature": "avg_ma7", "label_en": "7-day average price",
          "label_bn": "৭ দিনের গড় দাম", "direction": "up", "shap_value": 1.42}]
    Falls back to an empty list if SHAP fails for any reason (e.g. an
    unsupported model shape) — this is a "nice to have" layer on top of
    the prediction, never something that should break a forecast.
    """
    try:
        explainer = _get_explainer(id(model), model)
        raw = explainer.shap_values(row[FEATURE_COLS])
        arr = np.array(raw)

        # Multi-quantile models: shape (1, n_features, 3) -> take P50 slice.
        # Single-output models: shape (1, n_features) -> use as-is.
        if arr.ndim == 3:
            contrib = arr[0, :, P50_OUTPUT_INDEX]
        else:
            contrib = arr[0]

        order = np.argsort(-np.abs(contrib))[:top_n]
        factors = []
        for i in order:
            feat = FEATURE_COLS[i]
            val = float(contrib[i])
            if abs(val) < 1e-6:
                continue
            label = FEATURE_LABELS.get(feat, {"en": feat, "bn": feat})
            factors.append({
                "feature": feat,
                "label_en": label["en"],
                "label_bn": label["bn"],
                "direction": "up" if val > 0 else "down",
                "shap_value": round(val, 3),
            })
        return factors
    except Exception:
        return []