import json
import re
import os
import pandas as pd

# Food-relevant commodity_group_ids (from commodityGroupList in the dropdown data).
# Excluded: Fibre(33), Leather(35), Tobacco(34), Fertilizer(45), Others(44 - gold/silver/firewood/salt mix)
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
    41,  # Betel Nut/Betel Leaf
    42,  # Fruit
    43,  # Vegetable
    46,  # Bangla misc food group (chickpeas, mash, dal, etc.)
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(BASE_DIR, "data", "dam_dropdowns.json")
OUT_PATH = os.path.join(BASE_DIR, "data", "commodity_mapping.csv")


def load_commodities(json_path: str) -> pd.DataFrame:
    with open(json_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    commodities = raw["data"]["commodityNameList"]
    rows = []
    for item in commodities:
        rows.append({
            "commodity_id": item["value"],
            "commodity_group_id": item.get("commodity_group_id"),
            "commodity_sub_group_id": item.get("commodity_sub_group_id"),
            "product_en": (item.get("text_en") or "").strip(),
            "product_bn": (item.get("text_bn") or "").strip(),
            "status": item.get("status", 1),
        })
    return pd.DataFrame(rows)


def slugify(name: str) -> str:
    name = name.lower()
    name = re.sub(r"[()\/]", "", name)
    name = re.sub(r"[^a-z0-9]+", "_", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name


def build_mapping():
    if not os.path.exists(JSON_PATH):
        print(f"ERROR: {JSON_PATH} not found. Save the dropdown JSON there first.")
        return

    df = load_commodities(JSON_PATH)
    print(f"Loaded {len(df)} total commodities from JSON")

    df = df[df["commodity_group_id"].isin(FOOD_GROUP_IDS)]
    df = df[df["status"] == 1]
    df = df[df["product_en"] != ""]

    df["standard_key"] = df["product_en"].apply(slugify)

    dupe_mask = df["standard_key"].duplicated(keep=False)
    df.loc[dupe_mask, "standard_key"] = (
        df.loc[dupe_mask, "standard_key"] + "_" + df.loc[dupe_mask, "commodity_id"].astype(str)
    )

    out_df = df[["commodity_id", "standard_key", "product_en", "product_bn", "commodity_group_id"]]
    out_df = out_df.sort_values("commodity_group_id")

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    out_df.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")

    print(f"Built mapping with {len(out_df)} food commodities")
    print(f"Saved: {OUT_PATH}")
    print("\nBreakdown by group:")
    print(out_df["commodity_group_id"].value_counts().sort_index())


if __name__ == "__main__":
    build_mapping()