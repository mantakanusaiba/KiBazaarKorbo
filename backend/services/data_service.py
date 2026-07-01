import pandas as pd
import os
import math

# Anchor to this file's location (backend/services/data_service.py), not the
# process's current working directory. The previous "../../data/..." default
# was resolved relative to cwd, which silently pointed at the wrong file
# whenever uvicorn was launched from the backend/ folder — landing one
# directory above the project root instead of inside it, and reading a
# stale CSV that was never touched by fetch_live_prices.py.
_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CSV_PATH = os.getenv("CSV_PATH", os.path.join(_BASE_DIR, "data", "processed", "market_prices_clean.csv"))

_cache: dict = {"df": None, "mtime": None}

def load_data() -> pd.DataFrame:
    """
    Loads the CSV into memory, but re-reads it whenever the file's
    modification time changes — so a live fetch script that overwrites
    the CSV is picked up on the next request without restarting the server.
    """
    mtime = os.path.getmtime(CSV_PATH)
    if _cache["df"] is None or _cache["mtime"] != mtime:
        df = pd.read_csv(CSV_PATH)
        # The historical CSV uses MM/DD/YYYY, but fetch_live_prices.py appends
        # new rows stamped with date.today().isoformat() (YYYY-MM-DD). Once both
        # formats coexist in the same column, a single fixed `format=` guess
        # breaks on whichever style it didn't lock onto. format="mixed" parses
        # each value independently instead of inferring one format for the column.
        df["date"] = pd.to_datetime(df["date"], format="mixed")
        _cache["df"] = df
        _cache["mtime"] = mtime
    return _cache["df"]

def _sanitize(records: list[dict]) -> list[dict]:
    """Replace NaN with None in a list of record dicts so the values
    survive JSON serialization (Starlette's JSONResponse uses allow_nan=False).
    Must run AFTER to_dict() — df.where(df.notnull(), None) silently casts
    None back to NaN on float64 columns, so it doesn't actually work."""
    for record in records:
        for key, value in record.items():
            if isinstance(value, float) and math.isnan(value):
                record[key] = None
    return records

def get_latest_prices() -> list[dict]:
    df = load_data()
    latest_date = df["date"].max()
    latest = df[df["date"] == latest_date]
    return _sanitize(latest.to_dict(orient="records"))

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
    return _sanitize(sub.round(2).to_dict(orient="records"))

def get_market_comparison(product: str) -> list[dict]:
    df = load_data()
    latest_date = df["date"].max()
    sub = df[(df["standard_key"] == product) & (df["date"] == latest_date)]
    sub = sub[["market", "min_price", "max_price", "avg_price"]]
    return _sanitize(sub.to_dict(orient="records"))

def get_products() -> list[str]:
    df = load_data()
    return sorted(df["standard_key"].dropna().unique().tolist())

def refresh_data() -> dict:
    """
    Triggers a live fetch of today's prices from the DAM API and merges
    them into the CSV. Called by the /api/refresh endpoint, or can be run
    on a schedule (cron) by calling scripts/fetch_live_prices.py directly.
    """
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
    import fetch_live_prices

    rows_fetched = fetch_live_prices.run()

    # Force the next load_data() call to re-read the CSV from disk
    _cache["df"] = None
    _cache["mtime"] = None

    return {"status": "ok", "rows_fetched": rows_fetched}
