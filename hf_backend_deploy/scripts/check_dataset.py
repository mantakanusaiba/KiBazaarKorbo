import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "7days.csv")

if not os.path.exists(CSV_PATH):
    raise FileNotFoundError(f"Dataset not found: {CSV_PATH}")

df = pd.read_csv(CSV_PATH)

print("Dataset check")
print("-------------")
print("Rows:", len(df))
print("Columns:", df.columns.tolist())
print("Date range:", df["date"].min(), "to", df["date"].max())
print("Markets:", df["market"].nunique())
print("Products:", df["standard_key"].nunique())

print("\nRows per market:")
print(df["market"].value_counts())

print("\nTop 20 products:")
print(df["product_en"].value_counts().head(20))

print("\nSample:")
print(df.head(20))