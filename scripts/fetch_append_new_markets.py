import os
import time
import argparse
import shutil
from datetime import date, timedelta

import pandas as pd
import requests
from tqdm import tqdm

API_URL = "https://moa-services.com/agri-service/crop-price-info/reports/price-report/market-daily-price-report"
OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Referer": "https://moa-services.com/market-directory/market-daily-price-report",
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COMMODITY_MAPPING_PATH = os.path.join(BASE_DIR, "data", "commodity_mapping.csv")

MAIN_CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "market_prices_all.csv")
WEBSITE_CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "market_prices_clean.csv")
BACKUP_PATH = os.path.join(BASE_DIR, "data", "processed", "market_prices_all_before_new_markets.csv")

PROGRESS_PATH = os.path.join(BASE_DIR, "data", "processed", "fetch_new_markets_progress.txt")

REQUEST_DELAY = 0.4
MAX_RETRIES = 3


# Only NEW markets here.
# Previous markets will stay in your old CSV.
NEW_MARKET_CONFIGS = {
    # Chittagong division
    "cox_bazar_sadar_bajar": {
        "division_id": 1,
        "district_id": 9,
        "upazila_id": 80,
        "market_id": 103,
    },
    "feni_sadar_bajar": {
        "division_id": 1,
        "district_id": 2,
        "upazila_id": 19,
        "market_id": 104,
    },
    "lakshmipur_sadar_bajar": {
        "division_id": 1,
        "district_id": 7,
        "upazila_id": 60,
        "market_id": 39,
    },
    "noakhali_sadar_bajar": {
        "division_id": 1,
        "district_id": 5,
        "upazila_id": 43,
        "market_id": 106,
    },

    # Dhaka division districts
    "faridpur_sadar_bajar": {
        "division_id": 6,
        "district_id": 52,
        "upazila_id": 390,
        "market_id": 52,
    },
    "gopalganj_sadar_borobajar": {
        "division_id": 6,
        "district_id": 51,
        "upazila_id": 385,
        "market_id": 54,
    },
    "kishorganj_bajar": {
        "division_id": 6,
        "district_id": 45,
        "upazila_id": 352,
        "market_id": 108,
    },
    "madaripur_sadar_bajar": {
        "division_id": 6,
        "district_id": 50,
        "upazila_id": 381,
        "market_id": 25,
    },
    "manikganj_bajar": {
        "division_id": 6,
        "district_id": 46,
        "upazila_id": 360,
        "market_id": 109,
    },
    "munshiganj_sadar_bajar": {
        "division_id": 6,
        "district_id": 48,
        "upazila_id": 370,
        "market_id": 59,
    },
    "narayanganj_sadar_bajar": {
        "division_id": 6,
        "district_id": 43,
        "upazila_id": 330,
        "market_id": 17,
    },
    "norshingdi_sadar_bajar": {
        "division_id": 6,
        "district_id": 40,
        "upazila_id": 313,
        "market_id": 26,
    },
    "rajbari_sadar_bajar": {
        "division_id": 6,
        "district_id": 49,
        "upazila_id": 376,
        "market_id": 47,
    },
    "shariyatpur_sadar_bajar": {
        "division_id": 6,
        "district_id": 42,
        "upazila_id": 322,
        "market_id": 110,
    },
    "tangail_bajar": {
        "division_id": 6,
        "district_id": 44,
        "upazila_id": 342,
        "market_id": 111,
    },
}


# Market -> weather location key
MARKET_TO_WEATHER_LOCATION = {
    "cox_bazar_sadar_bajar": "cox_bazar",
    "feni_sadar_bajar": "feni",
    "lakshmipur_sadar_bajar": "lakshmipur",
    "noakhali_sadar_bajar": "noakhali",

    "faridpur_sadar_bajar": "faridpur",
    "gopalganj_sadar_borobajar": "gopalganj",
    "kishorganj_bajar": "kishoreganj",
    "madaripur_sadar_bajar": "madaripur",
    "manikganj_bajar": "manikganj",
    "munshiganj_sadar_bajar": "munshiganj",
    "narayanganj_sadar_bajar": "narayanganj",
    "norshingdi_sadar_bajar": "narsingdi",
    "rajbari_sadar_bajar": "rajbari",
    "shariyatpur_sadar_bajar": "shariatpur",
    "tangail_bajar": "tangail",
}


# Approximate district HQ coordinates for historical weather
WEATHER_LOCATIONS = {
    "cox_bazar": {"latitude": 21.4272, "longitude": 92.0058},
    "feni": {"latitude": 23.0159, "longitude": 91.3976},
    "lakshmipur": {"latitude": 22.9447, "longitude": 90.8282},
    "noakhali": {"latitude": 22.8246, "longitude": 91.1017},

    "faridpur": {"latitude": 23.6070, "longitude": 89.8429},
    "gopalganj": {"latitude": 23.0051, "longitude": 89.8266},
    "kishoreganj": {"latitude": 24.4449, "longitude": 90.7766},
    "madaripur": {"latitude": 23.1641, "longitude": 90.1897},
    "manikganj": {"latitude": 23.8617, "longitude": 90.0003},
    "munshiganj": {"latitude": 23.5422, "longitude": 90.5305},
    "narayanganj": {"latitude": 23.6238, "longitude": 90.5000},
    "narsingdi": {"latitude": 23.9322, "longitude": 90.7154},
    "rajbari": {"latitude": 23.7574, "longitude": 89.6445},
    "shariatpur": {"latitude": 23.2423, "longitude": 90.4348},
    "tangail": {"latitude": 24.2513, "longitude": 89.9167},
}


# Same holiday flag logic as before.
# This only fills is_festival = 1/0. No extra holiday columns.
BD_HOLIDAYS = {
    # 2024
    "2024-02-21", "2024-02-26", "2024-03-17", "2024-03-26",
    "2024-04-07", "2024-04-10", "2024-04-11", "2024-04-12",
    "2024-04-14", "2024-05-01", "2024-05-22", "2024-05-23",
    "2024-06-16", "2024-06-17", "2024-06-18", "2024-07-17",
    "2024-08-26", "2024-09-16", "2024-10-10", "2024-10-11",
    "2024-10-12", "2024-10-13", "2024-12-16", "2024-12-25",

    # 2025
    "2025-02-15", "2025-02-21", "2025-03-26", "2025-03-27",
    "2025-03-28", "2025-03-29", "2025-03-30", "2025-03-31",
    "2025-04-01", "2025-04-02", "2025-04-03", "2025-04-14",
    "2025-05-01", "2025-05-11", "2025-06-05", "2025-06-06",
    "2025-06-07", "2025-06-08", "2025-06-09", "2025-06-10",
    "2025-07-06", "2025-08-05", "2025-08-16", "2025-09-05",
    "2025-09-06", "2025-10-01", "2025-10-02", "2025-12-16",
    "2025-12-25",

    # 2026
    "2026-02-04", "2026-02-21", "2026-03-17", "2026-03-18",
    "2026-03-19", "2026-03-20", "2026-03-21", "2026-03-22",
    "2026-03-23", "2026-03-24", "2026-03-25", "2026-03-26",
    "2026-04-13", "2026-04-14", "2026-05-01", "2026-05-25",
    "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29",
    "2026-05-30", "2026-05-31", "2026-06-17", "2026-06-26",
    "2026-08-05", "2026-08-26", "2026-09-04", "2026-10-20",
    "2026-10-21", "2026-12-16", "2026-12-25",
}


DEFAULT_COLUMNS = [
    "date",
    "market",
    "division_id",
    "district_id",
    "upazila_id",
    "market_id",
    "standard_key",
    "product_en",
    "product_bn",
    "commodity_id",
    "unit",
    "min_price",
    "max_price",
    "avg_price",
    "day_of_week",
    "month",
    "year",
    "is_weekend",
    "is_festival",
    "rainfall_mm",
    "temp_avg_c",
    "source",
]


def parse_float(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except Exception:
        return None


def load_existing_dataset():
    if not os.path.exists(MAIN_CSV_PATH):
        raise FileNotFoundError(
            f"Previous dataset not found: {MAIN_CSV_PATH}\n"
            "Put your existing market_prices_all.csv there first."
        )

    df = pd.read_csv(MAIN_CSV_PATH)
    df.columns = [str(c).strip() for c in df.columns]

    return df


def load_commodity_mapping():
    if not os.path.exists(COMMODITY_MAPPING_PATH):
        raise FileNotFoundError(
            "commodity_mapping.csv not found. Run scripts/build_commodity_mapping.py first."
        )

    df = pd.read_csv(COMMODITY_MAPPING_PATH)

    return {
        row.commodity_id: {
            "standard_key": row.standard_key,
            "product_en": row.product_en,
            "product_bn": row.product_bn,
        }
        for row in df.itertuples()
    }


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
            response = requests.post(API_URL, headers=HEADERS, json=payload, timeout=30)
            response.raise_for_status()

            body = response.json()

            if not body.get("success"):
                return []

            return body.get("data", [])

        except Exception as e:
            print(f"[Retry {attempt}/{MAX_RETRIES}] {market_name} {price_date}: {e}")
            time.sleep(2)

    return []


def fetch_weather_for_location(location_key, start_date, end_date):
    coords = WEATHER_LOCATIONS[location_key]

    params = {
        "latitude": coords["latitude"],
        "longitude": coords["longitude"],
        "start_date": start_date,
        "end_date": end_date,
        "daily": "temperature_2m_mean,precipitation_sum",
        "timezone": "Asia/Dhaka",
    }

    print(f"Fetching weather for {location_key}: {start_date} to {end_date}")

    for attempt in range(1, 4):
        try:
            response = requests.get(OPEN_METEO_URL, params=params, timeout=60)
            response.raise_for_status()

            body = response.json()
            daily = body.get("daily", {})

            weather = {}

            dates = daily.get("time", [])
            temps = daily.get("temperature_2m_mean", [])
            rains = daily.get("precipitation_sum", [])

            for d, t, r in zip(dates, temps, rains):
                weather[d] = {
                    "temp_avg_c": t,
                    "rainfall_mm": r,
                }

            return weather

        except Exception as e:
            print(f"Weather retry {attempt}/3 failed for {location_key}: {e}")
            time.sleep(2)

    raise RuntimeError(f"Could not fetch weather for {location_key}")


def build_weather_lookup(start_date, end_date):
    weather_lookup = {}

    needed_locations = sorted(set(MARKET_TO_WEATHER_LOCATION.values()))

    for location_key in needed_locations:
        location_weather = fetch_weather_for_location(location_key, start_date, end_date)

        for date_str, values in location_weather.items():
            weather_lookup[(location_key, date_str)] = values

        time.sleep(1)

    return weather_lookup


def load_progress():
    if not os.path.exists(PROGRESS_PATH):
        return set()

    with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
        return set(line.strip() for line in f if line.strip())


def save_progress(key):
    os.makedirs(os.path.dirname(PROGRESS_PATH), exist_ok=True)

    with open(PROGRESS_PATH, "a", encoding="utf-8") as f:
        f.write(key + "\n")


def save_combined(existing_df, new_rows, base_columns):
    if not new_rows:
        print("No new rows to save yet.")
        return existing_df

    new_df = pd.DataFrame(new_rows)

    # Make sure no extra columns are added.
    # If existing CSV has a fixed column order, use that.
    for col in base_columns:
        if col not in new_df.columns:
            new_df[col] = ""

    new_df = new_df[base_columns]

    combined = pd.concat([existing_df, new_df], ignore_index=True)

    combined = combined.drop_duplicates(
        subset=["date", "market", "standard_key"],
        keep="last",
    )

    if all(col in combined.columns for col in ["date", "market", "standard_key"]):
        combined = combined.sort_values(["date", "market", "standard_key"])

    combined.to_csv(MAIN_CSV_PATH, index=False, encoding="utf-8-sig")
    shutil.copy(MAIN_CSV_PATH, WEBSITE_CSV_PATH)

    print(f"Saved combined dataset.")
    print(f"Total rows now: {len(combined)}")
    print(f"Main: {MAIN_CSV_PATH}")
    print(f"Website copy: {WEBSITE_CSV_PATH}")

    return combined


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=730)
    parser.add_argument(
        "--reset-progress",
        action="store_true",
        help="Reset only new-market progress file. Does not delete old dataset.",
    )
    args = parser.parse_args()

    if args.reset_progress and os.path.exists(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)
        print(f"Deleted progress file: {PROGRESS_PATH}")

    existing_df = load_existing_dataset()

    shutil.copy(MAIN_CSV_PATH, BACKUP_PATH)
    print(f"Backup created: {BACKUP_PATH}")

    base_columns = list(existing_df.columns)

    # If your existing CSV somehow missed a required column, add it.
    # This still keeps a consistent final CSV.
    for col in DEFAULT_COLUMNS:
        if col not in base_columns:
            base_columns.append(col)
            existing_df[col] = ""

    existing_df = existing_df[base_columns]

    commodity_map = load_commodity_mapping()
    done = load_progress()

    today = date.today()

    dates = [
        (today - timedelta(days=i)).isoformat()
        for i in range(args.days)
    ]

    start_date = min(dates)
    end_date = max(dates)

    print(f"Fetching NEW markets only.")
    print(f"Days: {args.days}")
    print(f"New markets: {len(NEW_MARKET_CONFIGS)}")
    print(f"Date range: {start_date} to {end_date}")

    weather_lookup = build_weather_lookup(start_date, end_date)

    buffer_rows = []

    for market_name, config in NEW_MARKET_CONFIGS.items():
        weather_location = MARKET_TO_WEATHER_LOCATION[market_name]

        for price_date in tqdm(dates, desc=market_name):
            progress_key = f"{market_name}|{price_date}"

            if progress_key in done:
                continue

            raw_rows = fetch_one_day(market_name, config, price_date)

            d = pd.Timestamp(price_date)

            weather = weather_lookup.get((weather_location, price_date), {})
            rainfall_mm = weather.get("rainfall_mm", "")
            temp_avg_c = weather.get("temp_avg_c", "")

            for item in raw_rows:
                commodity_id = item.get("commodity_id")

                if commodity_id not in commodity_map:
                    continue

                product_info = commodity_map[commodity_id]

                min_price = parse_float(item.get("r_lowestPrice"))
                max_price = parse_float(item.get("r_highestPrice"))
                avg_price = parse_float(item.get("r_avgPriceAvg"))

                if min_price is None and max_price is None and avg_price is None:
                    continue

                if avg_price is None and min_price is not None and max_price is not None:
                    avg_price = round((min_price + max_price) / 2, 2)

                row = {
                    "date": price_date,
                    "market": market_name,
                    "division_id": config["division_id"],
                    "district_id": config["district_id"],
                    "upazila_id": config["upazila_id"],
                    "market_id": config["market_id"],
                    "standard_key": product_info["standard_key"],
                    "product_en": product_info["product_en"],
                    "product_bn": product_info["product_bn"],
                    "commodity_id": commodity_id,
                    "unit": item.get("unit_retail", ""),
                    "min_price": min_price,
                    "max_price": max_price,
                    "avg_price": avg_price,
                    "day_of_week": d.dayofweek,
                    "month": d.month,
                    "year": d.year,

                    # Bangladesh weekend: Friday + Saturday
                    "is_weekend": int(d.dayofweek in [4, 5]),

                    # Hardcoded Bangladesh holiday dates
                    "is_festival": int(price_date in BD_HOLIDAYS),

                    # Weather values from Open-Meteo
                    "rainfall_mm": rainfall_mm,
                    "temp_avg_c": temp_avg_c,

                    "source": "DAM_API_HISTORICAL",
                }

                buffer_rows.append(row)

            save_progress(progress_key)

            if len(buffer_rows) >= 1000:
                existing_df = save_combined(existing_df, buffer_rows, base_columns)
                buffer_rows = []

            time.sleep(REQUEST_DELAY)

    if buffer_rows:
        existing_df = save_combined(existing_df, buffer_rows, base_columns)

    print("\nDONE.")
    print(f"Final dataset: {MAIN_CSV_PATH}")
    print(f"Website dataset: {WEBSITE_CSV_PATH}")

    print("\nCheck:")
    print("Total rows:", len(existing_df))
    print("Total markets:", existing_df["market"].nunique())
    print("Weekend rows:", int(pd.to_numeric(existing_df["is_weekend"], errors="coerce").fillna(0).sum()))
    print("Festival rows:", int(pd.to_numeric(existing_df["is_festival"], errors="coerce").fillna(0).sum()))


if __name__ == "__main__":
    main()