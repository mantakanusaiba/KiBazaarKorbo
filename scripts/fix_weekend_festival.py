import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INPUT_PATH = os.path.join(BASE_DIR, "data", "processed", "market_prices_all.csv")
OUTPUT_PATH = os.path.join(BASE_DIR, "data", "processed", "market_prices_all_fixed.csv")

# Hardcoded Bangladesh holiday dates for your 2-year dataset.
# This updates only is_festival = 1/0.
BANGLADESH_HOLIDAYS = {
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


def main():
    if not os.path.exists(INPUT_PATH):
        raise FileNotFoundError(f"File not found: {INPUT_PATH}")

    df = pd.read_csv(INPUT_PATH)

    print("Loaded:", INPUT_PATH)
    print("Rows:", len(df))
    print("Columns:", df.columns.tolist())

    if "date" not in df.columns:
        raise ValueError("No 'date' column found. Weekend/festival cannot be calculated.")

    # Convert date safely
    df["_date_temp"] = pd.to_datetime(df["date"], errors="coerce")

    bad_dates = df["_date_temp"].isna().sum()
    if bad_dates > 0:
        print(f"WARNING: {bad_dates} rows have invalid dates.")

    # Update existing columns only
    # Monday=0, Tuesday=1, Wednesday=2, Thursday=3, Friday=4, Saturday=5, Sunday=6
    df["is_weekend"] = df["_date_temp"].dt.dayofweek.isin([4, 5]).astype(int)

    df["_date_str_temp"] = df["_date_temp"].dt.strftime("%Y-%m-%d")
    df["is_festival"] = df["_date_str_temp"].isin(BANGLADESH_HOLIDAYS).astype(int)

    # Remove temporary columns
    df = df.drop(columns=["_date_temp", "_date_str_temp"])

    # Save fixed file
    df.to_csv(OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print("\nDone.")
    print("Saved fixed file:", OUTPUT_PATH)
    print("Weekend rows:", int(df["is_weekend"].sum()))
    print("Festival rows:", int(df["is_festival"].sum()))

    print("\nFestival sample:")
    print(df[df["is_festival"] == 1][["date", "market", "product_en", "is_festival"]].head(20))

    print("\nWeekend sample:")
    print(df[df["is_weekend"] == 1][["date", "market", "product_en", "is_weekend"]].head(20))


if __name__ == "__main__":
    main()