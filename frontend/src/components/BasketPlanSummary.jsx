import { computeBasketRecommendation } from "../utils/basketMath";
import { bnNum, bnTk } from "../utils/banglaFormat";

const REC_STYLES = {
    shop_today: { bg: "var(--green-600)", light: "var(--green-50)", border: "var(--green-100)", text: "var(--green-700)" },
    wait: { bg: "var(--brand-600)", light: "var(--brand-50)", border: "var(--brand-100)", text: "var(--brand-700)" },
    mixed: { bg: "var(--gray-500)", light: "var(--gray-50)", border: "var(--gray-200)", text: "var(--gray-700)" },
};

export default function BasketPlanSummary({ plan }) {
    const rec = computeBasketRecommendation(plan.items);
    const style = rec ? REC_STYLES[rec.key] : REC_STYLES.mixed;

    return (
        <div style={{
            background: "var(--surface)",
            border: "1px solid var(--gray-200)",
            borderRadius: "var(--radius-lg)",
            padding: "24px 26px",
            boxShadow: "var(--shadow-sm)",
            position: "relative",
            overflow: "hidden",
        }}>
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 4,
                background: "linear-gradient(90deg, var(--brand-600), var(--brand-500))",
            }} />

            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                flexWrap: "wrap", gap: 14, marginBottom: 20,
            }}>
                <div>
                    <div style={{
                        fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
                        color: "var(--gray-900)", letterSpacing: "-0.3px",
                    }}>
                        আপনার বাজার প্ল্যান
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 3 }}>
                        লিস্টে {bnNum(plan.items.length)}টি পণ্য আছে
                    </div>
                </div>

                {rec && (
                    <div style={{
                        background: style.light, border: `1px solid ${style.border}`,
                        borderRadius: "var(--radius-md)", padding: "10px 18px",
                        display: "flex", alignItems: "center", gap: 10,
                    }}>
                        <span style={{ fontSize: 20 }}>{rec.icon}</span>
                        <div>
                            <div style={{ fontWeight: 700, color: style.text, fontSize: 14.5 }}>
                                {rec.label}
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--gray-500)" }}>
                                {bnNum(rec.total)}টির মধ্যে {bnNum(rec.buyCount)}টি আজ কিনলে ভালো
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 14,
            }}>
                <Stat label="সবচেয়ে কম খরচ (একাধিক বাজার)" value={plan.multi_market_total} accent="var(--brand-700)" />
                {plan.best_single_market && (
                    <Stat
                        label="এক বাজারে কিনলে"
                        value={plan.best_single_market.total}
                        sub={!plan.best_single_market.covers_all_items ? "সব পণ্য নেই" : null}
                    />
                )}
                {plan.savings_vs_shopping_blind > 0 && (
                    <Stat label="এলোমেলো কেনার চেয়ে সাশ্রয়" value={plan.savings_vs_shopping_blind} accent="var(--green-600)" prefix="সাশ্রয় " />
                )}
                {plan.savings_of_multi_over_single > 0 && (
                    <Stat label="একাধিক বাজারে বাড়তি সাশ্রয়" value={plan.savings_of_multi_over_single} accent="var(--green-600)" prefix="সাশ্রয় " />
                )}
            </div>
        </div>
    );
}

function Stat({ label, value, sub, accent, prefix = "" }) {
    return (
        <div>
            <div style={{
                fontSize: 11, color: "var(--gray-500)", textTransform: "uppercase",
                letterSpacing: "0.5px", marginBottom: 4,
            }}>
                {label}
            </div>
            <div style={{
                fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
                color: accent || "var(--gray-900)", letterSpacing: "-0.5px",
            }}>
                {prefix}{bnTk(value, 2)}
            </div>
            {sub && <div style={{ fontSize: 11.5, color: "var(--gray-500)", marginTop: 3 }}>{sub}</div>}
        </div>
    );
}