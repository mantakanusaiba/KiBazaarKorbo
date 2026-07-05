import { marketLabel } from "../data/marketRegions";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function MarketRankingCards({ ranking }) {
    if (!ranking || ranking.length === 0) return null;

    const cheapest = ranking[0];
    const top5 = ranking.slice(0, 5);

    return (
        <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {top5.map((m, i) => (
                    <div key={m.market} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        background: i === 0 ? "var(--green-50)" : "var(--gray-50)",
                        border: `1px solid ${i === 0 ? "var(--green-100)" : "var(--gray-200)"}`,
                        borderRadius: "var(--radius-sm)",
                        padding: "10px 16px",
                    }}>
                        <span style={{ fontSize: 18, width: 26 }}>{MEDALS[i] || `#${i + 1}`}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--gray-900)" }}>
                                {marketLabel(m.market)}
                            </div>
                            {!m.covers_all_items && (
                                <div style={{ fontSize: 11.5, color: "var(--gray-500)" }}>
                                    {m.covers_n_of[1]}টির মধ্যে {m.covers_n_of[0]}টি পণ্য আছে
                                </div>
                            )}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: i === 0 ? "var(--green-700)" : "var(--gray-900)" }}>
                            ৳{m.total.toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>

            {ranking.length > 1 && cheapest.total < ranking[1].total && (
                <div style={{ fontSize: 12.5, color: "var(--gray-600)" }}>
                    <b>{marketLabel(cheapest.market)}</b> থেকে কিনলে পরের সেরা অপশনের তুলনায় প্রায় ৳{(ranking[1].total - cheapest.total).toFixed(2)} সাশ্রয় হতে পারে।
                </div>
            )}
        </div>
    );
}
