import pandas as pd
from ml.calendar_bd import add_weekend_festival_cols, add_days_to_festival

TARGET_PRODUCTS = [
    "chicken", "egg", "potato", "onion", "tomato",
    "lentil", "soybean_oil", "green_chilli", "rice", "fish"
]

WEATHER_COLS = ["rainfall_mm", "temp_avg_c"]

MAX_HORIZON_DAYS = 7  # supports both 5-day and 7-day forecasts (7 is the superset)


def build_features(df: pd.DataFrame, horizon_days: int = MAX_HORIZON_DAYS) -> pd.DataFrame:
    df = df.copy()
    # The historical CSV uses MM/DD/YYYY, but some fetch scripts append rows
    # stamped with ISO (YYYY-MM-DD). format="mixed" parses each value
    # independently instead of locking onto one format for the whole column
    # (mirrors the fix already applied in services/data_service.py).
    df["date"] = pd.to_datetime(df["date"], format="mixed")
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

    # Weather features (rolling, per product+market so it stays location-correct)
    for col in WEATHER_COLS:
        df[f"{col}_ma7"] = (
            df.groupby(["standard_key", "market"])[col]
            .transform(lambda x: x.rolling(7, min_periods=1).mean())
        )
    df["rainfall_7d_total"] = (
        df.groupby(["standard_key", "market"])["rainfall_mm"]
        .transform(lambda x: x.rolling(7, min_periods=1).sum())
    )

    # Time features
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"]       = df["date"].dt.month

    # Weekend/festival — correct BD convention (Fri/Sat weekend), single
    # source of truth shared with forecasting. This OVERWRITES any
    # is_weekend/is_festival columns already in the CSV with the correct
    # values, so training and future-day forecasting can never disagree.
    df = add_weekend_festival_cols(df, date_col="date")
    df = add_days_to_festival(df, date_col="date")

    # Market as a categorical feature — one global model per product,
    # market-specific price behavior is learned via this code rather than
    # training a separate model per market (which the data is too sparse
    # for on some markets).
    df["market_code"] = df["market"].astype("category").cat.codes

    # Multi-horizon targets: target_t1 .. target_t{horizon_days}
    for h in range(1, horizon_days + 1):
        df[f"target_t{h}"] = (
            df.groupby(["standard_key", "market"])["avg_price"]
            .shift(-h)
        )

    return df


def build_weather_climatology(df: pd.DataFrame) -> pd.DataFrame:
    """Per-market, per-day-of-year average rainfall/temp. Used to fill in
    weather for future forecast days (days 2-7) where actual weather isn't
    known yet. Grouped by market (not global) so a forecast for one market
    never leaks another market's weather pattern."""
    clim = df.copy()
    clim["date"] = pd.to_datetime(clim["date"], format="mixed")
    clim["doy"] = clim["date"].dt.dayofyear
    return (
        clim.groupby(["market", "doy"])[WEATHER_COLS]
        .mean()
        .reset_index()
    )


FEATURE_COLS = [
    "avg_lag1", "avg_lag3", "avg_lag7",
    "avg_ma7", "avg_ma30",
    "price_change_1d", "price_change_7d",
    "rainfall_mm", "temp_avg_c",
    "rainfall_mm_ma7", "temp_avg_c_ma7", "rainfall_7d_total",
    "day_of_week", "month", "is_weekend", "is_festival", "days_to_festival",
    "market_code",
]