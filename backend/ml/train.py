import os
import sys
import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error


# --------------------------------------------------
# Project paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.feature_engineering import build_features, FEATURE_COLS, MAX_HORIZON_DAYS


DEFAULT_CSV_PATH = PROJECT_ROOT / "data" / "processed" / "market_prices_clean.csv"
CSV_PATH = Path(os.getenv("CSV_PATH", str(DEFAULT_CSV_PATH))).resolve()

MODEL_DIR = PROJECT_ROOT / "ml" / "models"
MODEL_OUT = MODEL_DIR / "price_models.pkl"
METRICS_OUT = MODEL_DIR / "metrics.json"
REMOVED_OUT = MODEL_DIR / "removed_products.json"

MODEL_DIR.mkdir(parents=True, exist_ok=True)


# --------------------------------------------------
# Filtering rules
# --------------------------------------------------

MIN_SAMPLES = 100
MAX_MAPE = 15
MIN_UNIQUE_TARGETS = 3
HORIZONS = range(1, MAX_HORIZON_DAYS + 1)  # 1..7, covers both 5-day and 7-day forecasts


# --------------------------------------------------
# Helper functions
# --------------------------------------------------

def sort_product_data(sub: pd.DataFrame) -> pd.DataFrame:
    """
    Sort product data by date if a date column exists.
    This is important because we are using a time-based split.
    """

    possible_date_cols = [
        "date",
        "price_date",
        "collection_date",
        "created_at",
        "updated_at"
    ]

    for col in possible_date_cols:
        if col in sub.columns:
            temp = sub.copy()
            temp["_sort_date"] = pd.to_datetime(temp[col], format="mixed", errors="coerce")

            if temp["_sort_date"].notna().sum() > 0:
                temp = temp.sort_values("_sort_date")
                return temp.drop(columns=["_sort_date"])

    # Fallback: keep existing order
    return sub


def safe_mape(y_true, y_pred) -> float:
    """
    Calculate MAPE safely.
    Removes zero or negative target values to avoid NaN/Infinity.
    """

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    valid_mask = y_true > 0

    if valid_mask.sum() == 0:
        return np.inf

    return np.mean(
        np.abs((y_true[valid_mask] - y_pred[valid_mask]) / y_true[valid_mask])
    ) * 100


def remove_product(removed_products, product, horizon, reason):
    """
    Store removed product+horizon reason.
    """
    key = f"{product}_t{horizon}"
    removed_products[key] = reason
    print(f"  Removing {key} — {reason}")


# --------------------------------------------------
# Load data
# --------------------------------------------------

print(f"Loading data from: {CSV_PATH}")

if not CSV_PATH.exists():
    raise FileNotFoundError(f"CSV file not found: {CSV_PATH}")

df = pd.read_csv(CSV_PATH)

print(f"Rows loaded: {len(df)}")

required_cols = ["standard_key", "market", "rainfall_mm", "temp_avg_c"]

for col in required_cols:
    if col not in df.columns:
        raise ValueError(f"Missing required column: {col}")

print("Building features...")
df = build_features(df, horizon_days=MAX_HORIZON_DAYS)

missing_features = [col for col in FEATURE_COLS if col not in df.columns]

if missing_features:
    raise ValueError(f"Missing feature columns: {missing_features}")


# --------------------------------------------------
# Train one model per product, per forecast horizon (1..7 days ahead)
# --------------------------------------------------

TARGET_PRODUCTS = df["standard_key"].dropna().unique()

# models[product][horizon] = fitted XGBRegressor
models: dict[str, dict[int, xgb.XGBRegressor]] = {}
metrics: dict[str, dict] = {}
removed_products: dict[str, str] = {}

print(f"\nTotal products found: {len(TARGET_PRODUCTS)}")
print(f"Horizons per product: {list(HORIZONS)}")
print("Training started...\n")

for product in TARGET_PRODUCTS:
    product_key = str(product)
    base = df[df["standard_key"] == product].copy()
    models[product_key] = {}

    for h in HORIZONS:
        target_col = f"target_t{h}"

        sub = base.dropna(subset=FEATURE_COLS + [target_col]).copy()
        sub = sub[sub[target_col] > 0]
        sub = sort_product_data(sub)

        # Rule 1: too few samples
        if len(sub) < MIN_SAMPLES:
            remove_product(removed_products, product_key, h,
                            f"Too few samples: {len(sub)} rows. Minimum required: {MIN_SAMPLES}")
            continue

        # Rule 2: target barely varies
        if sub[target_col].nunique() < MIN_UNIQUE_TARGETS:
            remove_product(removed_products, product_key, h,
                            f"Target price has too little variation: {sub[target_col].nunique()} unique values")
            continue

        # Time-based split: 80% train, 20% test
        split_idx = int(len(sub) * 0.8)

        X_tr = sub[FEATURE_COLS].iloc[:split_idx]
        y_tr = sub[target_col].iloc[:split_idx]

        X_te = sub[FEATURE_COLS].iloc[split_idx:]
        y_te = sub[target_col].iloc[split_idx:]

        if len(X_tr) == 0 or len(X_te) == 0:
            remove_product(removed_products, product_key, h, "Train or test split became empty")
            continue

        model = xgb.XGBRegressor(
            objective="reg:squarederror",
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=3,
            random_state=42,
            verbosity=0
        )

        model.fit(
            X_tr,
            y_tr,
            eval_set=[(X_te, y_te)],
            verbose=False
        )

        preds = model.predict(X_te)

        mae = mean_absolute_error(y_te, preds)
        mape = safe_mape(y_te.values, preds)

        # Rule 3: invalid metrics
        if not np.isfinite(mae) or not np.isfinite(mape):
            remove_product(removed_products, product_key, h, f"Invalid metric. MAE={mae}, MAPE={mape}")
            continue

        # Rule 4: suspicious perfect results
        if round(mae, 6) == 0 and round(mape, 6) == 0:
            remove_product(removed_products, product_key, h, "Suspicious perfect prediction: MAE=0 and MAPE=0")
            continue

        # Rule 5: high error
        if mape > MAX_MAPE:
            remove_product(removed_products, product_key, h, f"MAPE too high: {mape:.2f}%. Maximum allowed: {MAX_MAPE}%")
            continue

        models[product_key][h] = model

        metrics.setdefault(product_key, {})[f"t{h}"] = {
            "mae": float(round(mae, 2)),
            "mape": float(round(mape, 2)),
            "samples": int(len(sub)),
            "train_samples": int(len(X_tr)),
            "test_samples": int(len(X_te)),
            "unique_target_values": int(sub[target_col].nunique())
        }

        print(
            f"  Keeping {product_key} t+{h}: "
            f"MAE={mae:.2f} BDT | "
            f"MAPE={mape:.2f}% | "
            f"n={len(sub)}"
        )

    # Drop products where every horizon failed
    if not models[product_key]:
        del models[product_key]


# --------------------------------------------------
# Save outputs
# --------------------------------------------------

with open(MODEL_OUT, "wb") as f:
    pickle.dump(models, f)

with open(METRICS_OUT, "w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=2, ensure_ascii=False)

with open(REMOVED_OUT, "w", encoding="utf-8") as f:
    json.dump(removed_products, f, indent=2, ensure_ascii=False)


# --------------------------------------------------
# Final summary
# --------------------------------------------------

total_model_count = sum(len(h_dict) for h_dict in models.values())

print("\nTraining complete.")
print(f"Products with at least one usable horizon: {len(models)}")
print(f"Total (product, horizon) models saved: {total_model_count}")
print(f"Removed (product, horizon) combinations: {len(removed_products)}")

print(f"\nModel file saved to: {MODEL_OUT}")
print(f"Metrics file saved to: {METRICS_OUT}")
print(f"Removed products file saved to: {REMOVED_OUT}")