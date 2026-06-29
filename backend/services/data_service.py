import pandas as pd
import os
from functools import lru_cache

CSV_PATH = os.getenv("CSV_PATH", "../../data/processed/market_prices_clean.csv")

@lru_cache(maxsize=1)
def load_data() -> pd.DataFrame:
    df = pd.read_csv(CSV_PATH)
    df["date"] = pd.to_datetime(df["date"])
    return df

def get_latest_prices() -> list[dict]:
    df = load_data()
    latest_date = df["date"].max()
    latest = df[df["date"] == latest_date]
    return latest.to_dict(orient="records")

def get_price_history(product: str, days: int = 90) -> list[dict]:
    df = load_data()
    cutoff = df["date"].max() - pd.Timedelta(days=days)
    sub = df[(df["standard_key"] == product) & (df["date"] >= cutoff)]
    sub = sub.groupby("date").agg(
        avg_price=("avg_price", "mean"),
        min_price=("min_price", "min"),
        max_price=("max_price", "max")
    ).reset_index()
    sub["date"] = sub["date"].dt.strftime("%Y-%m-%d")
    return sub.round(2).to_dict(orient="records")

def get_market_comparison(product: str) -> list[dict]:
    df = load_data()
    latest_date = df["date"].max()
    sub = df[(df["standard_key"] == product) & (df["date"] == latest_date)]
    return sub[["market", "min_price", "max_price", "avg_price"]].to_dict(orient="records")

def get_products() -> list[str]:
    df = load_data()
    return sorted(df["standard_key"].dropna().unique().tolist())
