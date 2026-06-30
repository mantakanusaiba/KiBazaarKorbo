import os
import time
import argparse
from datetime import date, timedelta

import pandas as pd
import requests
from tqdm import tqdm

API_URL = "https://moa-services.com/agri-service/crop-price-info/reports/price-report/market-daily-price-report"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Referer": "https://moa-services.com/market-directory/market-daily-price-report",
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COMMODITY_MAPPING_PATH = os.path.join(BASE_DIR, "data", "commodity_mapping.csv")
OUT_PATH = os.path.join(BASE_DIR, "data", "processed", "market_price.csv")
PROGRESS_PATH = os.path.join(BASE_DIR, "data", "processed", "fetch_progress.txt")

# Confirmed Dhaka market IDs from your DAM API guide.
MARKET_CONFIGS = {
    "kawran_bazar": {
        "division_id": 6,
        "district_id": 47,
        "upazila_id": 494,
        "market_id": 8,
    },
    "mirpur_1_bazar": {
        "division_id": 6,
        "district_id": 47,
        "upazila_id": 494,
        "market_id": 11,
    },
    "mohammadpur_krishi_market": {
        "division_id": 6,
        "district_id": 47,
        "upazila_id": 494,
        "market_id": 4,
    },

}

REQUEST_DELAY = 0.4
MAX_RETRIES = 3


def build_payload(config, price_date):
    return {
        "division_id": [config["division_id"]],
        "district_id": [config["district_id"]],
        "upazila_id": [config["upazila_id"]],
        "market_id": [config["market_id"]],
        "price_type_id": ["Retail"],

        "district_name_bn": "",
        "district_name_en": "",
        "division_name_bn": "",
        "division_name_en": "",
        "market_name_bn": "",
        "market_name_en": "",

        "month_bn": "",
        "month_en": "",
        "month_id": 0,

        "price_date": price_date,
        "select_type": "Daily",

        "upazila_name_bn": "",
        "upazila_name_en": "",

        "week_bn": "",
        "week_en": "",
        "week_id": 0,

        "year": 0,
        "year_bn": "",
        "year_en": "",
    }


def fetch_one_day(market_name, config, price_date):
    payload = build_payload(config, price_date)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.post(
                API_URL,
                headers=HEADERS,
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            body = response.json()

            if not body.get("success"):
                return []

            return body.get("data", [])

        except Exception as e:
            print(f"[Retry {attempt}/{MAX_RETRIES}] {market_name} {price_date}: {e}")
            time.sleep(2)

    return []


def parse_float(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except Exception:
        return None


def load_commodity_mapping():
    if not os.path.exists(COMMODITY_MAPPING_PATH):
        raise FileNotFoundError(
            "commodity_mapping.csv not found. Run scripts/build_commodity_mapping.py first."
        )

    df = pd.read_csv(COMMODITY_MAPPING_PATH)

    id_to_key = dict(zip(df["commodity_id"], df["standard_key"]))
    id_to_en = dict(zip(df["commodity_id"], df["product_en"]))
    id_to_bn = dict(zip(df["commodity_id"], df["product_bn"]))

    return id_to_key, id_to_en, id_to_bn


def load_progress():
    if not os.path.exists(PROGRESS_PATH):
        return set()

    with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
        return set(line.strip() for line in f if line.strip())


def save_progress(key):
    os.makedirs(os.path.dirname(PROGRESS_PATH), exist_ok=True)

    with open(PROGRESS_PATH, "a", encoding="utf-8") as f:
        f.write(key + "\n")


def save_rows(rows):
    if not rows:
        return

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

    new_df = pd.DataFrame(rows)

    if os.path.exists(OUT_PATH):
        old_df = pd.read_csv(OUT_PATH)
        final_df = pd.concat([old_df, new_df], ignore_index=True)
    else:
        final_df = new_df

    final_df = final_df.drop_duplicates(
        subset=["date", "market", "standard_key"],
        keep="last",
    )

    final_df = final_df.sort_values(["date", "market", "standard_key"])
    final_df.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")

    print(f"Saved checkpoint. Total rows now: {len(final_df)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=7, help="How many days back to fetch")
    args = parser.parse_args()

    days_back = args.days

    id_to_key, id_to_en, id_to_bn = load_commodity_mapping()
    done = load_progress()

    today = date.today()

    dates = [
        (today - timedelta(days=i)).isoformat()
        for i in range(days_back)
    ]

    print(f"Fetching {days_back} days for {len(MARKET_CONFIGS)} markets")
    print(f"Saving to: {OUT_PATH}")

    buffer_rows = []

    for market_name, config in MARKET_CONFIGS.items():
        for price_date in tqdm(dates, desc=market_name):
            progress_key = f"{market_name}|{price_date}"

            if progress_key in done:
                continue

            raw_rows = fetch_one_day(market_name, config, price_date)

            d = pd.Timestamp(price_date)

            for item in raw_rows:
                commodity_id = item.get("commodity_id")

                if commodity_id not in id_to_key:
                    continue

                min_price = parse_float(item.get("r_lowestPrice"))
                max_price = parse_float(item.get("r_highestPrice"))
                avg_price = parse_float(item.get("r_avgPriceAvg"))

                if min_price is None and max_price is None and avg_price is None:
                    continue

                if avg_price is None and min_price is not None and max_price is not None:
                    avg_price = round((min_price + max_price) / 2, 2)

                buffer_rows.append({
                    "date": price_date,
                    "market": market_name,
                    "standard_key": id_to_key[commodity_id],
                    "product_en": id_to_en[commodity_id],
                    "product_bn": id_to_bn[commodity_id],
                    "commodity_id": commodity_id,
                    "unit": item.get("unit_retail", ""),
                    "min_price": min_price,
                    "max_price": max_price,
                    "avg_price": avg_price,
                    "day_of_week": d.dayofweek,
                    "month": d.month,
                    "year": d.year,
                    "is_weekend": int(d.dayofweek >= 5),
                    "is_festival": 0,
                    "rainfall_mm": "",
                    "temp_avg_c": "",
                    "source": "DAM_API_HISTORICAL",
                })

            save_progress(progress_key)

            if len(buffer_rows) >= 1000:
                save_rows(buffer_rows)
                buffer_rows = []

            time.sleep(REQUEST_DELAY)

    if buffer_rows:
        save_rows(buffer_rows)

    print("Done.")
    print(f"Dataset saved at: {OUT_PATH}")


if __name__ == "__main__":
    main()