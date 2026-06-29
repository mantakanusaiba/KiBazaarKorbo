import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error
import pickle
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from ml.feature_engineering import build_features, FEATURE_COLS

CSV_PATH  = os.getenv("CSV_PATH", "../../data/processed/market_prices_clean.csv")
MODEL_OUT = "ml/models/price_models.pkl"

os.makedirs("ml/models", exist_ok=True)

print(f"Loading data from: {CSV_PATH}")
df = pd.read_csv(CSV_PATH)
print(f"Rows loaded: {len(df)}")

df = build_features(df)

TARGET_PRODUCTS = df["standard_key"].dropna().unique()
models  = {}
metrics = {}

for product in TARGET_PRODUCTS:
    sub = df[df["standard_key"] == product].dropna(
        subset=FEATURE_COLS + ["target"]
    )

    if len(sub) < 30:
        print(f"  Skipping {product} — only {len(sub)} rows, need 30+")
        continue

    # Time-based split: 80% train, 20% test
    split_idx = int(len(sub) * 0.8)
    X_tr = sub[FEATURE_COLS].iloc[:split_idx]
    y_tr = sub["target"].iloc[:split_idx]
    X_te = sub[FEATURE_COLS].iloc[split_idx:]
    y_te = sub["target"].iloc[split_idx:]

    model = xgb.XGBRegressor(
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
        X_tr, y_tr,
        eval_set=[(X_te, y_te)],
        verbose=False
    )

    preds = model.predict(X_te)
    mae   = mean_absolute_error(y_te, preds)
    mape  = (abs(y_te.values - preds) / y_te.values).mean() * 100

    models[product]  = model
    metrics[product] = {"mae": round(mae, 2), "mape": round(mape, 2), "samples": len(sub)}
    print(f"  {product}: MAE={mae:.2f} BDT | MAPE={mape:.2f}% | n={len(sub)}")

with open(MODEL_OUT, "wb") as f:
    pickle.dump(models, f)

with open("ml/models/metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)

print(f"\nSaved {len(models)} models to {MODEL_OUT}")
print("Training complete.")
