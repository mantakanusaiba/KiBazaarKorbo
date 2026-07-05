/**
 * Pure helpers that turn the raw plan already returned by
 * POST /api/basket/optimize into the Basket page's headline signals:
 * the shop-today/wait/mixed badge, and the "insights" extremes (biggest
 * saving, fastest rising, most stable, most expensive).
 *
 * Nothing here calls the API or invents a number — every value comes
 * from `plan.items[].timing` / `plan.items[].best_price`, which the
 * backend already computes per item (see services/basket_optimizer.py).
 */

/**
 * Overall shopping recommendation, derived from the real per-item
 * buy_now/wait split basket_optimizer already returns — not a separate
 * invented rule. Threshold: >=70% of items buy_now -> "আজ বাজার করুন",
 * >=70% wait -> "Wait if possible", otherwise "কিছু আজ, কিছু পরে".
 */
export function computeBasketRecommendation(items) {
    if (!items || items.length === 0) return null;
    const buyCount = items.filter((i) => i.timing?.action === "buy_now").length;
    const total = items.length;
    const buyRatio = buyCount / total;

    if (buyRatio >= 0.7) {
        return { key: "shop_today", label: "আজ বাজার করুন", icon: "🟢", buyCount, total };
    }
    if (buyRatio <= 0.3) {
        return { key: "wait", label: "সম্ভব হলে অপেক্ষা করুন", icon: "🟡", buyCount, total };
    }
    return { key: "mixed", label: "কিছু আজ, কিছু পরে", icon: "🔵", buyCount, total };
}

/**
 * Splits the basket into the two buckets the backend's timing advice
 * actually supports (buy_now / wait) — no invented third state.
 */
export function bucketItems(items) {
    const buyToday = (items || []).filter((i) => i.timing?.action === "buy_now");
    const wait = (items || []).filter((i) => i.timing?.action === "wait");
    return { buyToday, wait };
}

/**
 * Headline "insights" — the extremes of the same per-item list shown in
 * the full plan, surfaced first so the user doesn't have to scan
 * everything to get the gist. Returns null for any card whose signal
 * isn't available (e.g. no item had a positive change_pct), rather than
 * showing a misleading default.
 */
export function computeBasketInsights(items) {
    if (!items || items.length === 0) return {};

    const withChange = items.filter((i) => i.timing?.change_pct != null);

    // "Saving" from buying today = avoiding tomorrow's predicted rise.
    // change_pct is already (predicted - current) / current * 100 (see
    // model_service.py), so today's line_total * change_pct/100 is the
    // ৳ amount this item's price is expected to move by — i.e. what
    // buying today avoids.
    const buyNowWithSaving = items
        .filter((i) => i.timing?.action === "buy_now" && i.timing?.change_pct > 0)
        .map((i) => ({ ...i, savingAmount: +(i.line_total * (i.timing.change_pct / 100)).toFixed(2) }));

    const biggestSaving = buyNowWithSaving
        .slice()
        .sort((a, b) => b.savingAmount - a.savingAmount)[0] || null;

    const fastestRising = withChange
        .slice()
        .sort((a, b) => b.timing.change_pct - a.timing.change_pct)[0] || null;

    const mostStable = withChange
        .slice()
        .sort((a, b) => Math.abs(a.timing.change_pct) - Math.abs(b.timing.change_pct))[0] || null;

    const mostExpensive = items
        .slice()
        .sort((a, b) => b.best_price - a.best_price)[0] || null;

    return { biggestSaving, fastestRising, mostStable, mostExpensive };
}