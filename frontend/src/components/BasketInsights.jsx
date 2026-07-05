import { computeBasketInsights } from "../utils/basketMath";
import { formatProductName } from "../utils/productAssets";
import { bnPct, bnTk } from "../utils/banglaFormat";

export default function BasketInsights({ items }) {
    const { biggestSaving, fastestRising, mostStable, mostExpensive } = computeBasketInsights(items);

    const cards = [
        biggestSaving && {
            icon: "💰", label: "সবচেয়ে বেশি সাশ্রয়",
            title: formatProductName(biggestSaving.product),
            detail: `আজ কিনলে প্রায় ${bnTk(biggestSaving.savingAmount, 2)} সাশ্রয়`,
            color: "var(--green-600)",
        },
        fastestRising && fastestRising.timing.change_pct > 0 && {
            icon: "📈", label: "দাম দ্রুত বাড়তে পারে",
            title: formatProductName(fastestRising.product),
            detail: `পরের আপডেটে +${bnPct(fastestRising.timing.change_pct, 1)} হতে পারে`,
            color: "var(--red-600)",
        },
        mostStable && {
            icon: "⚖️", label: "সবচেয়ে স্থির দাম",
            title: formatProductName(mostStable.product),
            detail: `সম্ভাব্য পরিবর্তন: ${mostStable.timing.change_pct > 0 ? "+" : ""}${bnPct(mostStable.timing.change_pct, 1)}`,
            color: "var(--gray-600)",
        },
        mostExpensive && {
            icon: "🏷️", label: "সবচেয়ে দামি পণ্য",
            title: formatProductName(mostExpensive.product),
            detail: `${bnTk(mostExpensive.best_price, 2)} / একক`,
            color: "var(--gray-600)",
        },
    ].filter(Boolean);

    if (cards.length === 0) return null;

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 12,
        }}>
            {cards.map((c) => (
                <div key={c.label} style={{
                    background: "var(--surface)",
                    border: "1px solid var(--gray-200)",
                    borderRadius: "var(--radius-md)",
                    padding: "14px 16px",
                    boxShadow: "var(--shadow-xs)",
                }}>
                    <div style={{
                        fontSize: 10.5, color: "var(--gray-500)", textTransform: "uppercase",
                        letterSpacing: "0.5px", marginBottom: 8, display: "flex", alignItems: "center", gap: 5,
                    }}>
                        <span>{c.icon}</span>{c.label}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--gray-900)", marginBottom: 2 }}>
                        {c.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: c.color, fontWeight: 600 }}>
                        {c.detail}
                    </div>
                </div>
            ))}
        </div>
    );
}