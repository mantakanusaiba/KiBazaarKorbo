import os
import time
import shutil
import requests
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INPUT_PATH = os.path.join(BASE_DIR, "data", "processed", "market_prices_all.csv")
BACKUP_PATH = os.path.join(BASE_DIR, "data", "processed", "market_prices_all_before_update.csv")
WEBSITE_PATH = os.path.join(BASE_DIR, "data", "processed", "market_prices_clean.csv")

OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"

# Your market -> weather city mapping
MARKET_TO_WEATHER_LOCATION = {
    "kawran_bazar": "dhaka",
    "mirpur_1_bazar": "dhaka",
    "mohammadpur_krishi_market": "dhaka",

    "chittagong_sadar_bazar": "chattogram",

    "rajshahi_sadar_bazar": "rajshahi",

    "rangpur_city_bazar": "rangpur",
}

# Approximate district/city coordinates
WEATHER_LOCATIONS = {
    "dhaka": {
        "latitude": 23.8103,
        "longitude": 90.4125,
    },
    "chattogram": {
        "latitude": 22.3569,
        "longitude": 91.7832,
    },
    "rajshahi": {
        "latitude": 24.3745,
        "longitude": 88.6042,
    },
    "rangpur": {
        "latitude": 25.7439,
        "longitude": 89.2752,
    },
}

# Public / government holiday dates for Bangladesh.
# This is enough for your 2-year data covering 2024-2026.
BD_HOLIDAYS = {
    # 2024
    "2024-02-21",
    "2024-02-26",
    "2024-03-17",
    "2024-03-26",
    "2024-04-07",
    "2024-04-10",
    "2024-04-11",
    "2024-04-12",
    "2024-04-14",
    "2024-05-01",
    "2024-05-22",
    "2024-05-23",
    "2024-06-16",
    "2024-06-17",
    "2024-06-18",
    "2024-07-17",
    "2024-08-15",
    "2024-08-26",
    "2024-09-16",
    "2024-10-10",
    "2024-10-11",
    "2024-10-12",
    "2024-10-13",
    "2024-12-16",
    "2024-12-25",

    # 2025
    "2025-02-15",
    "2025-02-21",
    "2025-03-26",
    "2025-03-27",
    "2025-03-28",
    "2025-03-29",
    "2025-03-30",
    "2025-03-31",
    "2025-04-01",
    "2025-04-02",
    "2025-04-03",
    "2025-04-14",
    "2025-05-01",
    "2025-05-11",
    "2025-06-05",
    "2025-06-06",
    "2025-06-07",
    "2025-06-08",
    "2025-06-09",
    "2025-06-10",
    "2025-07-06",
    "2025-08-05",
    "2025-08-16",
    "2025-09-05",
    "2025-09-06",
    "2025-10-01",
    "2025-10-02",
    "2025-12-16",
    "2025-12-25",

    # 2026
    "2026-02-04",
    "2026-02-21",
    "2026-03-17",
    "2026-03-18",
    "2026-03-19",
    "2026-03-20",
    "2026-03-21",
    "2026-03-22",
    "2026-03-23",
    "2026-03-24",
    "2026-03-25",
    "2026-03-26",
    "2026-04-13",
    "2026-04-14",
    "2026-05-01",
    "2026-05-25",
    "2026-05-26",
    "2026-05-27",
    "2026-05-28",
    "2026-05-29",
    "2026-05-30",
    "2026-05-31",
    "2026-06-17",
    "2026-06-26",
    "2026-08-05",
    "2026-08-26",
    "2026-09-04",
    "2026-10-20",
    "2026-10-21",
    "2026-12-16",
    "2026-12-25",
}


def normalize_columns(df):
    # Fix possible spaces around column names
    df.columns = [str(c).strip() for c in df.columns]
    return df


def fetch_weather(location_key, start_date, end_date):
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

            wdf = pd.DataFrame({
                "date": daily.get("time", []),
                "_weather_location": location_key,
                "_temp_avg_c": daily.get("temperature_2m_mean", []),
                "_rainfall_mm": daily.get("precipitation_sum", []),
            })

            wdf["date"] = pd.to_datetime(wdf["date"], errors="coerce")

            return wdf

        except Exception as e:
            print(f"Retry {attempt}/3 failed for {location_key}: {e}")
            time.sleep(2)

    raise RuntimeError(f"Could not fetch weather for {location_key}")


def main():
    if not os.path.exists(INPUT_PATH):
        raise FileNotFoundError(f"Cannot find input file: {INPUT_PATH}")

    # backup first
    shutil.copy(INPUT_PATH, BACKUP_PATH)
    print(f"Backup saved: {BACKUP_PATH}")

    df = pd.read_csv(INPUT_PATH)
    df = normalize_columns(df)

    print("Loaded:", INPUT_PATH)
    print("Rows:", len(df))
    print("Columns:", df.columns.tolist())

    if "date" not in df.columns:
        raise ValueError("Your CSV has no 'date' column. Cannot update weekend/holiday/weather.")

    if "market" not in df.columns:
        raise ValueError("Your CSV has no 'market' column. Cannot map weather by market.")

    # Ensure required columns exist
    for col in ["is_weekend", "is_festival", "rainfall_mm", "temp_avg_c"]:
        if col not in df.columns:
            df[col] = 0 if col in ["is_weekend", "is_festival"] else ""

    # Parse date
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    bad_dates = df["date"].isna().sum()
    if bad_dates > 0:
        print(f"WARNING: {bad_dates} rows have invalid dates. They cannot be updated properly.")

    # 1) Update weekend
    # pandas: Monday=0, Tuesday=1, Wednesday=2, Thursday=3, Friday=4, Saturday=5, Sunday=6
    # Bangladesh weekend: Friday + Saturday
    df["is_weekend"] = df["date"].dt.dayofweek.isin([4, 5]).astype(int)

    # 2) Update festival
    date_str = df["date"].dt.strftime("%Y-%m-%d")
    df["is_festival"] = date_str.isin(BD_HOLIDAYS).astype(int)

    print("After weekend/holiday update:")
    print("Weekend rows:", int(df["is_weekend"].sum()))
    print("Festival rows:", int(df["is_festival"].sum()))

    # 3) Update weather
    df["_weather_location"] = df["market"].map(MARKET_TO_WEATHER_LOCATION)

    missing_locations = df[df["_weather_location"].isna()]["market"].dropna().unique().tolist()
    if missing_locations:
        raise ValueError(
            "These markets are missing from MARKET_TO_WEATHER_LOCATION:\n"
            + "\n".join(missing_locations)
        )

    start_date = df["date"].min().strftime("%Y-%m-%d")
    end_date = df["date"].max().strftime("%Y-%m-%d")

    weather_frames = []

    for location_key in sorted(df["_weather_location"].unique()):
        wdf = fetch_weather(location_key, start_date, end_date)
        weather_frames.append(wdf)
        time.sleep(1)

    weather_all = pd.concat(weather_frames, ignore_index=True)

    before_rows = len(df)

    df = df.merge(
        weather_all,
        on=["date", "_weather_location"],
        how="left",
    )

    after_rows = len(df)

    if before_rows != after_rows:
        raise RuntimeError(
            f"Row count changed after weather merge! Before={before_rows}, After={after_rows}"
        )

    df["rainfall_mm"] = pd.to_numeric(df["_rainfall_mm"], errors="coerce")
    df["temp_avg_c"] = pd.to_numeric(df["_temp_avg_c"], errors="coerce")

    # Drop temporary columns only
    df = df.drop(columns=["_weather_location", "_rainfall_mm", "_temp_avg_c"])

    # Convert date back to yyyy-mm-dd
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")

    # Keep same original columns order as much as possible
    df.to_csv(INPUT_PATH, index=False, encoding="utf-8-sig")
    shutil.copy(INPUT_PATH, WEBSITE_PATH)

    print("\nDONE.")
    print("Updated original file:", INPUT_PATH)
    print("Copied website dataset:", WEBSITE_PATH)
    print("Rows:", len(df))
    print("Weekend rows:", int(df["is_weekend"].sum()))
    print("Festival rows:", int(df["is_festival"].sum()))
    print("Missing rainfall_mm:", int(df["rainfall_mm"].isna().sum()))
    print("Missing temp_avg_c:", int(df["temp_avg_c"].isna().sum()))

    print("\nSample weekend rows:")
    print(df[df["is_weekend"] == 1][["date", "market", "product_en", "is_weekend"]].head(10))

    print("\nSample festival rows:")
    print(df[df["is_festival"] == 1][["date", "market", "product_en", "is_festival"]].head(10))


if __name__ == "__main__":
    main()