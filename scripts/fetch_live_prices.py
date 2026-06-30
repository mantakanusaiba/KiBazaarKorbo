"""
Fetches *today's* prices from the DAM market-daily-price-report API for all
configured markets, and upserts them into data/processed/market_prices_clean.csv
— the same file the FastAPI backend reads from.

Run manually:
    python scripts/fetch_live_prices.py

Run on a schedule (cron example, every day at 9am and 3pm):
    0 9,15 * * * cd /path/to/proj && /path/to/venv/bin/python scripts/fetch_live_prices.py >> logs/fetch.log 2>&1

This script is idempotent: running it twice for the same day just overwrites
that day's rows (keep="last" on the dedup), it never duplicates rows.
"""

import os
import time
from datetime import date

import pandas as pd
import requests

API_URL = "https://moa-services.com/agri-service/crop-price-info/reports/price-report/market-daily-price-report"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Referer": "https://moa-services.com/market-directory/market-daily-price-report",
}

# Fill in your 5 confirmed markets here (same shape as fetch_historical_prices.py)
MARKET_CONFIGS = {
    "kawran_bazar": {"division_id": 6, "district_id": 47, "upazila_id": 494, "market_id": 8},
    "jatrabari":    {"division_id": 6, "district_id": 47, "upazila_id": 494, "market_id": 4},   
    "mirpur_11":    {"division_id": 6, "district_id": 47, "upazila_id": 494, "market_id": 11},  
    # "market_4":   {"division_id": 6, "district_id": 47, "upazila_id": 494, "market_id": ???},
    # "market_5":   {"division_id": 6, "district_id": 47, "upazila_id": 494, "market_id": ???},
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "market_prices_clean.csv")
COMMODITY_MAPPING_PATH = os.path.join(BASE_DIR, "data", "commodity_mapping.csv")

REQUEST_DELAY = 0.4
MAX_RETRIES = 3


def load_commodity_mapping() -> dict:
    """commodity_id -> (standard_key, product_en, product_bn)"""
    if not os.path.exists(COMMODITY_MAPPING_PATH):
        print(f"WARNING: {COMMODITY_MAPPING_PATH} not found. Products tagged as 'unknown'.")
        return {}
    df = pd.read_csv(COMMODITY_MAPPING_PATH)
    return {
        row.commodity_id: (row.standard_key, row.product_en, row.product_bn)
        for row in df.itertuples()
    }


def build_payload(config: dict, price_date: str) -> dict:
    return {
        "division_id": [config["division_id"]],
        "district_id": [config["district_id"]],
        "upazila_id": [config["upazila_id"]],
        "market_id": [config["market_id"]],
        "price_type_id": ["Retail"],
        "district_name_bn": "", "district_name_en": "",
        "division_name_bn": "", "division_name_en": "",
        "market_name_bn": "", "market_name_en": "",
        "month_bn": "", "month_en": "", "month_id": 0,
        "price_date": price_date,
        "select_type": "Daily",
        "upazila_name_bn": "", "upazila_name_en": "",
        "week_bn": "", "week_en": "", "week_id": 0,
        "year": 0, "year_bn": "", "year_en": "",
    }


def fetch_one_day(market_key: str, config: dict, price_date: str) -> list[dict]:
    payload = build_payload(config, price_date)
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(API_URL, headers=HEADERS, json=payload, timeout=20)
            resp.raise_for_status()
            body = resp.json()
            if not body.get("success"):
                return []
            return body.get("data", [])
        except requests.exceptions.RequestException as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(2)
                continue
            print(f"    [SKIP] {market_key} {price_date}: {e}")
            return []
    return []


def parse_rows(raw_data: list[dict], market_key: str, report_date: str, commodity_map: dict) -> list[dict]:
    rows = []
    d = pd.Timestamp(report_date)
    for item in raw_data:
        commodity_id = item.get("commodity_id")
        standard_key, product_en, product_bn = commodity_map.get(
            commodity_id, ("unknown", item.get("commodity_name_en", ""), item.get("commodity_name_bn", ""))
        )

        try:
            min_p = float(item.get("r_lowestPrice", 0) or 0)
            max_p = float(item.get("r_highestPrice", 0) or 0)
            avg_p = float(item.get("r_avgPriceAvg", 0) or 0)
        except (ValueError, TypeError):
            continue

        if min_p == 0 and max_p == 0:
            continue

        rows.append({
            "date": report_date,
            "market": market_key,
            "standard_key": standard_key,
            "product_en": product_en,
            "product_bn": product_bn,
            "unit": item.get("unit_retail", ""),
            "min_price": min_p,
            "max_price": max_p,
            "avg_price": avg_p if avg_p else round((min_p + max_p) / 2, 2),
            "day_of_week": d.dayofweek,
            "month": d.month,
            "year": d.year,
            "is_weekend": int(d.dayofweek >= 5),
            "is_festival": 0,
            "rainfall_mm": "",
            "temp_avg_c": "",
            "source": "DAM_API_LIVE",
        })
    return rows


def upsert_csv(rows: list[dict]):
    if not rows:
        print("No rows fetched — CSV not modified.")
        return

    new_df = pd.DataFrame(rows)

    if os.path.exists(CSV_PATH):
        existing = pd.read_csv(CSV_PATH)
        combined = pd.concat([existing, new_df], ignore_index=True)
    else:
        os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
        combined = new_df

    # Upsert: same (date, market, standard_key) wins with the newest fetch
    combined = combined.drop_duplicates(subset=["date", "market", "standard_key"], keep="last")
    combined = combined.sort_values(["date", "market", "standard_key"])
    combined.to_csv(CSV_PATH, index=False, encoding="utf-8-sig")
    print(f"CSV updated: {len(new_df)} new/updated rows, {len(combined)} total rows in {CSV_PATH}")


def run(target_date: str | None = None):
    commodity_map = load_commodity_mapping()
    price_date = target_date or date.today().isoformat()

    all_rows = []
    for market_key, config in MARKET_CONFIGS.items():
        print(f"Fetching {market_key} for {price_date}...")
        raw_data = fetch_one_day(market_key, config, price_date)
        rows = parse_rows(raw_data, market_key, price_date, commodity_map)
        print(f"  -> {len(rows)} rows")
        all_rows.extend(rows)
        time.sleep(REQUEST_DELAY)

    upsert_csv(all_rows)
    return len(all_rows)


if __name__ == "__main__":
    run()
