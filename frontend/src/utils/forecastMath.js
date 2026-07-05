/**
 * Pure helpers that turn the raw numbers already returned by the backend
 * (/api/explain/{product} + /api/forecast/{product}) into the Section 1
 * "Product Decision Summary" signals: confidence, risk, savings, trend.
 *
 * Nothing here calls the API or invents a number that isn't derivable
 * from predicted_low / predicted_high / predicted_price / change_pct.
 */

export function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

/**
 * "Prediction Confidence" — how narrow the model's P10-P90 band is
 * relative to its own median forecast. This is NOT a calibrated
 * probability that the price will land on a specific number; it only
 * reflects how tightly the model's uncertainty range clusters for this
 * product/horizon.
 *
 * band_pct = (high - low) / mid * 100
 * confidence_pct = clamp(100 - band_pct * 4, 40, 97)
 * stars = round(confidence_pct / 20)   // 0-5
 */
export function computeConfidence(low, high, mid) {
    if (low == null || high == null || !mid) return null;
    const bandPct = ((high - low) / mid) * 100;
    const confidencePct = clamp(100 - bandPct * 4, 40, 97);
    return {
        bandPct,
        confidencePct: Math.round(confidencePct),
        stars: Math.round(confidencePct / 20),
    };
}

/** Same band-width signal as confidence, framed as risk instead. */
export function computeRisk(bandPct) {
    if (bandPct == null) return null;
    if (bandPct < 8) return { level: "low", label: "ঝুঁকি কম" };
    if (bandPct < 18) return { level: "medium", label: "ঝুঁকি মাঝারি" };
    return { level: "high", label: "ঝুঁকি বেশি" };
}

/**
 * Estimated savings, computed only from numbers already on the page —
 * no extra backend call, no fabricated figures. Buying-today savings
 * uses tomorrow's point forecast; waiting-2-days savings uses day 2's
 * P10 (predicted_low), i.e. the best case for waiting. `week` is the
 * `forecast` array from /api/forecast/{product}; day 2 may legitimately
 * be absent if that horizon was filtered out during training, so callers
 * must handle `hasDay2 === false`.
 */
export function computeSavings({ currentAvg, predictedTomorrow, week }) {
    const buyTodaySaving =
        currentAvg != null && predictedTomorrow != null
            ? Math.max(0, predictedTomorrow - currentAvg)
            : null;

    const day2 = (week || []).find((d) => d.day === 2);
    const hasDay2 = !!day2 && day2.predicted_low != null;
    const waitSaving =
        hasDay2 && currentAvg != null
            ? Math.max(0, currentAvg - day2.predicted_low)
            : null;

    return { buyTodaySaving, waitSaving, hasDay2 };
}

/**
 * Overall 7-day trend sentence source. Each entry in `week` already
 * carries change_pct relative to TODAY's price (see backend
 * services/model_service.py), so the furthest available horizon tells
 * us where the model expects the price to land by the end of the
 * window. Uses the same +/-2% threshold the backend's own
 * predict_tomorrow() uses to bucket "increase"/"decrease"/"stable".
 */
export function computeTrend(week) {
    if (!week || week.length === 0) return null;
    const last = week[week.length - 1];
    if (last.change_pct == null) return null;
    let direction = "stable";
    if (last.change_pct > 2) direction = "rising";
    else if (last.change_pct < -2) direction = "falling";
    return {
        direction,
        pct: last.change_pct,
        horizonDays: last.day,
        endDate: last.date,
    };
}
