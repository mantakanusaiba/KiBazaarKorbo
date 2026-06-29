import pandas as pd

TARGET_PRODUCTS = [
    "chicken", "egg", "potato", "onion", "tomato",
    "lentil", "soybean_oil", "green_chilli", "rice", "fish"
]

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["standard_key", "market", "date"])

    # Lag features per product+market group
    for lag in [1, 3, 7]:
        df[f"avg_lag{lag}"] = (
            df.groupby(["standard_key", "market"])["avg_price"]
            .shift(lag)
        )

    # Moving averages
    for window in [7, 30]:
        df[f"avg_ma{window}"] = (
            df.groupby(["standard_key", "market"])["avg_price"]
            .transform(lambda x: x.rolling(window, min_periods=1).mean())
        )

    # Price momentum
    df["price_change_1d"] = df["avg_price"] - df["avg_lag1"]
    df["price_change_7d"] = df["avg_price"] - df["avg_lag7"]

    # Time features
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"]       = df["date"].dt.month
    df["is_weekend"]  = (df["day_of_week"] >= 5).astype(int)

    # Festival flag — use existing column if present, otherwise 0
    if "is_festival" not in df.columns:
        df["is_festival"] = 0

    # Target: next day's price
    df["target"] = (
        df.groupby(["standard_key", "market"])["avg_price"]
        .shift(-1)
    )

    return df.filter(TARGET_PRODUCTS, axis=0) if False else df

FEATURE_COLS = [
    "avg_lag1", "avg_lag3", "avg_lag7",
    "avg_ma7", "avg_ma30",
    "price_change_1d", "price_change_7d",
    "day_of_week", "month", "is_weekend", "is_festival"
]
