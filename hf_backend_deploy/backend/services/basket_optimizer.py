"""
Grocery basket optimizer.

Given a shopping list (product -> qty), this pulls today's per-market prices
AND tomorrow's forecast for each product (both of which already exist in
data_service / model_service) and turns them into an actionable plan:

  1. multi_market plan  - cheapest market for EACH item independently
                           (lowest total spend, but may mean visiting
                           several markets)
  2. best_single_market  - the one market that covers the whole list for
                           the lowest total (realistic "I only want to go
                           to one place" option)
  3. timing advice per item - "buy today" vs "wait" based on the existing
                           predict_tomorrow() forecast, so the user knows
                           whether to lock in today's price or hold off.

This is a small constrained-optimization problem solved greedily:
- Per-item assignment (step 1) is the classic "assignment problem" solved
  optimally by picking argmin price per row - greedy IS optimal here
  because items don't compete for a shared resource.
- Single-market selection (step 2) is evaluated by brute-force summing
  each candidate market's coverage - fine at hackathon scale (a handful
  of markets), and still strictly better than "just display numbers".
"""
from services.data_service import get_market_comparison
from services.model_service import predict_tomorrow


def _timing_advice(product: str, market: str) -> dict:
    try:
        forecast = predict_tomorrow(product, market)
    except Exception:
        # Model file missing/unreadable, etc. Degrade gracefully rather
        # than failing the whole basket optimization for one bad product.
        return {"action": "buy_now", "reason": "No forecast available.", "change_pct": None}

    if "error" in forecast:
        return {"action": "buy_now", "reason": "No forecast available.", "change_pct": None}

    change_pct = forecast["change_pct"]
    direction = forecast["direction"]

    if direction == "decrease" and change_pct <= -3:
        return {
            "action": "wait",
            "reason": f"Model predicts a {abs(change_pct)}% drop tomorrow.",
            "change_pct": change_pct,
        }
    return {
        "action": "buy_now",
        "reason": (
            f"Price expected to rise {change_pct}% tomorrow." if direction == "increase"
            else "Price expected to stay roughly flat."
        ),
        "change_pct": change_pct,
    }


def optimize_basket(items: list[dict], markets: list[str] | None = None) -> dict:
    """
    items: [{"product": "onion", "qty": 2}, ...]
    markets: optional allow-list of market keys (e.g. the markets belonging
        to a single division). When given, every comparison — per-item
        cheapest market, best single market, and the full ranking — is
        restricted to this set, so "best market" reflects markets the user
        can actually get to rather than the cheapest market nationwide.
        None/empty means no restriction (all markets considered).
    """
    market_filter = set(markets) if markets else None

    per_item = []
    market_totals: dict[str, float] = {}
    market_coverage: dict[str, int] = {}
    naive_total = 0.0
    multi_market_total = 0.0
    unresolved = []

    for entry in items:
        product = entry["product"]
        qty = float(entry.get("qty", 1))

        rows = get_market_comparison(product)
        if market_filter is not None:
            rows = [r for r in rows if r["market"] in market_filter]
        if not rows:
            unresolved.append(product)
            continue

        # cheapest market for this single item
        cheapest = min(rows, key=lambda r: r["avg_price"])
        avg_of_markets = sum(r["avg_price"] for r in rows) / len(rows)

        naive_total += avg_of_markets * qty
        multi_market_total += cheapest["avg_price"] * qty

        timing = _timing_advice(product, cheapest["market"])

        per_item.append({
            "product": product,
            "qty": qty,
            "best_market": cheapest["market"],
            "best_price": round(cheapest["avg_price"], 2),
            "line_total": round(cheapest["avg_price"] * qty, 2),
            "market_options": rows,
            "timing": timing,
        })

        # accumulate towards "best single market" candidate totals
        for r in rows:
            market_totals[r["market"]] = market_totals.get(r["market"], 0) + r["avg_price"] * qty
            market_coverage[r["market"]] = market_coverage.get(r["market"], 0) + 1

    n_items = len(per_item)
    fully_covering = {
        m: total for m, total in market_totals.items() if market_coverage.get(m) == n_items
    }

    best_single_market = None
    if fully_covering:
        name = min(fully_covering, key=fully_covering.get)
        best_single_market = {
            "market": name,
            "total": round(fully_covering[name], 2),
            "covers_all_items": True,
        }
    elif market_totals:
        # no single market has everything - surface the best partial option
        name = max(market_coverage, key=lambda m: (market_coverage[m], -market_totals[m]))
        best_single_market = {
            "market": name,
            "total": round(market_totals[name], 2),
            "covers_all_items": False,
            "covers_n_of": [market_coverage[name], n_items],
        }

    savings_vs_naive = round(naive_total - multi_market_total, 2)
    savings_vs_single = (
        round(best_single_market["total"] - multi_market_total, 2)
        if best_single_market else 0
    )

    # Full ranked market list — same numbers used to pick best_single_market
    # above, just exposed in full instead of only the winner. Markets that
    # cover every item in the basket are ranked first (cheapest total
    # first); partial-coverage markets are listed after, most-complete
    # first. Nothing new is computed here — market_totals/market_coverage
    # already existed, this just returns them shaped for display.
    ranked_markets = []
    for m, total in market_totals.items():
        covers_all = market_coverage.get(m) == n_items
        ranked_markets.append({
            "market": m,
            "total": round(total, 2),
            "covers_all_items": covers_all,
            "covers_n_of": [market_coverage[m], n_items],
        })
    # Full-coverage markets first. If no market covers every selected item,
    # show the most useful partial markets first: higher coverage, then lower total.
    ranked_markets.sort(
        key=lambda r: (
            not r["covers_all_items"],
            -r["covers_n_of"][0],
            r["total"],
        )
    )

    return {
        "items": per_item,
        "unresolved_products": unresolved,
        "multi_market_total": round(multi_market_total, 2),
        "best_single_market": best_single_market,
        "market_ranking": ranked_markets,
        "naive_avg_total": round(naive_total, 2),
        "savings_vs_shopping_blind": savings_vs_naive,
        "savings_of_multi_over_single": savings_vs_single,
        "wait_recommended_for": [i["product"] for i in per_item if i["timing"]["action"] == "wait"],
    }