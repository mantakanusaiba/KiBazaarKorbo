import json
import re
import os
import pandas as pd

FOOD_GROUP_IDS = {
    26,  # Foodgrains
    27,  # Groundnut/Til
    28,  # Dal
    29,  # Oil Seed
    30,  # Oil
    32,  # Spices
    36,  # Milk
    37,  # Poultry
    38,  # Meat
    39,  # Egg
    40,  # Fish
    41,  # Betel Nut / Betel Leaf
    42,  # Fruit
    43,  # Vegetable
    46,  # Misc food
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(BASE_DIR, "data", "dam_dropdowns_clean.json")
OUT_PATH = os.path.join(BASE_DIR, "data", "commodity_mapping.csv")


def slugify(name: str) -> str:
    name = str(name).lower().strip()
    name = re.sub(r"[()\/]", "", name)
    name = re.sub(r"[^a-z0-9]+", "_", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name


def main():
    if not os.path.exists(JSON_PATH):
        raise FileNotFoundError(f"Could not find {JSON_PATH}")

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    commodities = raw["data"]["commodityNameList"]

    rows = []

    for item in commodities:
        commodity_id = item.get("value")
        group_id = item.get("commodity_group_id")
        status = item.get("status", 1)

        if status != 1:
            continue

        if group_id not in FOOD_GROUP_IDS:
            continue

        product_en = str(item.get("text_en", "")).strip()
        product_bn = str(item.get("text_bn", "")).strip()

        if not product_en:
            continue

        rows.append({
            "commodity_id": commodity_id,
            "standard_key": slugify(product_en),
            "product_en": product_en,
            "product_bn": product_bn,
            "commodity_group_id": group_id,
            "unit_retail": item.get("unit_retail"),
        })

    df = pd.DataFrame(rows)

    duplicate_mask = df["standard_key"].duplicated(keep=False)
    df.loc[duplicate_mask, "standard_key"] = (
        df.loc[duplicate_mask, "standard_key"]
        + "_"
        + df.loc[duplicate_mask, "commodity_id"].astype(str)
    )

    df = df.sort_values(["commodity_group_id", "product_en"])

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    df.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")

    print("Commodity mapping created successfully.")
    print(f"Saved to: {OUT_PATH}")
    print(f"Total food commodities: {len(df)}")
    print(df.head(20))


if __name__ == "__main__":
    main()