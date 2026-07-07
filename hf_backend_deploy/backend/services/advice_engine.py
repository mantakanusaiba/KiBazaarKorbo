def get_advice(direction: str, change_pct: float) -> dict:
    """Convert forecast direction into simple actionable advice."""
    if direction == "increase" and change_pct > 5:
        return {
            "advice": "buy_now",
            "label":  "Buy Today",
            "reason": "Price likely to rise significantly tomorrow.",
            "color":  "green"
        }
    elif direction == "increase":
        return {
            "advice": "buy_now",
            "label":  "Buy Today",
            "reason": "Price expected to increase slightly tomorrow.",
            "color":  "green"
        }
    elif direction == "decrease" and change_pct < -5:
        return {
            "advice": "wait",
            "label":  "Wait 2 Days",
            "reason": "Price may drop noticeably. Consider waiting.",
            "color":  "blue"
        }
    elif direction == "decrease":
        return {
            "advice": "wait",
            "label":  "Wait 1-2 Days",
            "reason": "Price may ease slightly tomorrow.",
            "color":  "blue"
        }
    else:
        return {
            "advice": "stable",
            "label":  "Price Stable",
            "reason": "Price expected to remain about the same.",
            "color":  "gray"
        }


def fair_price_check(paid: float, official_min: float, official_max: float) -> dict:
    if paid < official_min:
        return {
            "verdict": "below_range",
            "label":   "Below Official Range",
            "message": f"You paid {paid} BDT. Official minimum is {official_min} BDT. Good deal.",
            "color":   "green"
        }
    elif paid > official_max:
        overpaid = round(paid - official_max, 2)
        return {
            "verdict": "above_range",
            "label":   "Above Official Range",
            "message": f"You paid {paid} BDT. Official maximum is {official_max} BDT. You may have overpaid by {overpaid} BDT.",
            "color":   "red"
        }
    else:
        return {
            "verdict": "within_range",
            "label":   "Within Official Range",
            "message": f"You paid {paid} BDT. Official range is {official_min}–{official_max} BDT. Fair price.",
            "color":   "green"
        }