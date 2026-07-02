"""
Single source of truth for Bangladesh weekend/festival logic.

Both feature_engineering.py (training) and model_service.py (forecasting
future days) import from here, so the definition of "weekend" and
"festival" can never drift apart between train time and predict time.

Bangladesh's weekend is Friday + Saturday (NOT Saturday + Sunday).
Confirmed empirically against market_prices_clean.csv: is_weekend=1
rows land on dayofweek 4 (Friday) and 5 (Saturday) only.
"""

import pandas as pd
import numpy as np

BD_WEEKEND_DAYS = {4, 5}  # pandas dayofweek: Mon=0 ... Fri=4, Sat=5, Sun=6

# Same list as scripts/fix_weekend_festival.py — copied verbatim so both
# files can be pointed at this one set. If you add new years/dates, only
# edit here, then re-point fix_weekend_festival.py at this constant.
BANGLADESH_HOLIDAYS = {
    # 2024
    "2024-02-21", "2024-02-26", "2024-03-17", "2024-03-26", "2024-04-07",
    "2024-04-10", "2024-04-11", "2024-04-12", "2024-04-14", "2024-05-01",
    "2024-05-22", "2024-05-23", "2024-06-16", "2024-06-17", "2024-06-18",
    "2024-07-17", "2024-08-26", "2024-09-16", "2024-10-10", "2024-10-11",
    "2024-10-12", "2024-10-13", "2024-12-16", "2024-12-25",

    # 2025
    "2025-02-15", "2025-02-21", "2025-03-26", "2025-03-27", "2025-03-28",
    "2025-03-29", "2025-03-30", "2025-03-31", "2025-04-01", "2025-04-02",
    "2025-04-03", "2025-04-14", "2025-05-01", "2025-05-11", "2025-06-05",
    "2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09", "2025-06-10",
    "2025-07-06", "2025-08-05", "2025-08-16", "2025-09-05", "2025-09-06",
    "2025-10-01", "2025-10-02", "2025-12-16", "2025-12-25",

    # 2026
    "2026-02-04", "2026-02-21", "2026-03-17", "2026-03-18", "2026-03-19",
    "2026-03-20", "2026-03-21", "2026-03-22", "2026-03-23", "2026-03-24",
    "2026-03-25", "2026-03-26", "2026-04-13", "2026-04-14", "2026-05-01",
    "2026-05-25", "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29",
    "2026-05-30", "2026-05-31", "2026-06-17", "2026-06-26", "2026-08-05",
    "2026-08-26", "2026-09-04", "2026-10-20", "2026-10-21", "2026-12-16",
    "2026-12-25",
}

_HOLIDAY_TS = pd.to_datetime(sorted(BANGLADESH_HOLIDAYS))


def is_weekend_bd(date: pd.Timestamp) -> int:
    """1 if the date falls on Friday or Saturday (BD weekend), else 0."""
    return int(pd.Timestamp(date).dayofweek in BD_WEEKEND_DAYS)


def is_festival_bd(date: pd.Timestamp) -> int:
    """1 if the date is a known BD public holiday, else 0."""
    return int(pd.Timestamp(date).strftime("%Y-%m-%d") in BANGLADESH_HOLIDAYS)


def add_weekend_festival_cols(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """Vectorized version for a whole dataframe. Adds/overwrites
    is_weekend and is_festival using the correct BD convention."""
    df = df.copy()
    dow = df[date_col].dt.dayofweek
    df["is_weekend"] = dow.isin(BD_WEEKEND_DAYS).astype(int)
    df["is_festival"] = df[date_col].dt.strftime("%Y-%m-%d").isin(BANGLADESH_HOLIDAYS).astype(int)
    return df


def add_days_to_festival(df: pd.DataFrame, date_col: str = "date", cap: int = 14) -> pd.DataFrame:
    """Adds `days_to_festival`: number of days until the next known holiday,
    capped at `cap`. Captures pre-Eid demand run-up that a same-day
    is_festival dummy misses (buying typically spikes days *before*
    the holiday, not on it)."""
    df = df.copy()
    dates = df[date_col].values.astype("datetime64[ns]")
    holiday_arr = _HOLIDAY_TS.values.astype("datetime64[ns]")

    result = np.full(len(dates), cap, dtype=np.int64)
    for i, d in enumerate(dates):
        future = holiday_arr[holiday_arr >= d]
        if len(future):
            diff_days = (future[0] - d).astype("timedelta64[D]").astype(int)
            result[i] = min(diff_days, cap)
    df["days_to_festival"] = result
    return df
