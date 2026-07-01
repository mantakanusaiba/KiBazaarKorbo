"""
Personalized price-drop alert system.

No auth/DB in this hackathon build, so watches are stored in-memory,
keyed by a client_id the frontend generates once and keeps in
localStorage (see frontend/src/pages/PriceAlerts.jsx). This is enough
for a live demo and single-user judging session; swapping the dict for
a Postgres/Redis table later is a drop-in change since the interface
(_watchlist) is the only thing touched.

Trigger logic reuses predict_tomorrow()'s change_pct - a watch fires
when the predicted drop meets the user's threshold (default -5%).
"""
from services.model_service import predict_tomorrow

# client_id -> { product: threshold_pct }
_watchlist: dict[str, dict[str, float]] = {}

DEFAULT_THRESHOLD = -5.0


def add_watch(client_id: str, product: str, threshold_pct: float = DEFAULT_THRESHOLD) -> dict:
    _watchlist.setdefault(client_id, {})[product] = threshold_pct
    return {"status": "watching", "product": product, "threshold_pct": threshold_pct}


def remove_watch(client_id: str, product: str) -> dict:
    _watchlist.get(client_id, {}).pop(product, None)
    return {"status": "removed", "product": product}


def list_watches(client_id: str) -> dict:
    return _watchlist.get(client_id, {})


def check_alerts(client_id: str) -> list[dict]:
    watches = _watchlist.get(client_id, {})
    triggered = []

    for product, threshold in watches.items():
        try:
            forecast = predict_tomorrow(product)
        except Exception:
            continue
        if "error" in forecast:
            continue

        change_pct = forecast["change_pct"]
        if change_pct <= threshold:
            triggered.append({
                "product": product,
                "change_pct": change_pct,
                "threshold_pct": threshold,
                "current_avg": forecast["current_avg"],
                "predicted_tomorrow": forecast["predicted_tomorrow"],
                "message": (
                    f"{product.replace('_', ' ').title()} is predicted to drop "
                    f"{abs(change_pct)}% tomorrow - below your {abs(threshold)}% alert threshold."
                ),
            })

    return triggered