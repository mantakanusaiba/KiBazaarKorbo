import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "market_prices_all.csv")

if not os.path.exists(CSV_PATH):
    raise FileNotFoundError(f"File not found: {CSV_PATH}")

df = pd.read_csv(CSV_PATH)

print("File:", CSV_PATH)
print("Rows:", len(df))
print("Date range:", df["date"].min(), "to", df["date"].max())
print("Markets:", df["market"].nunique())
print("Products:", df["standard_key"].nunique())

print("\nRows per market:")
print(df["market"].value_counts())

print("\nColumns:")
print(df.columns.tolist())

print("\nSample:")
print(df.head(20))