import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getPriceHistory } from "../api/client";
import ProductSelector from "../components/ProductSelector";
import TrendChart from "../components/TrendChart";

const PERIODS = [
    { label: "30 days", days: 30 },
    { label: "60 days", days: 60 },
    { label: "90 days", days: 90 },
    { label: "6 months", days: 180 },
];

export default function ProductSearch() {
    const [params, setParams] = useSearchParams();
    const [product, setProduct] = useState(params.get("product") || "");
    const [days, setDays] = useState(30);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [latest, setLatest] = useState(null);

    const load = (prod, d) => {
        if (!prod) return;
        setLoading(true);
        getPriceHistory(prod, d)
            .then((r) => {
                setHistory(r.data);
                if (r.data.length) setLatest(r.data[r.data.length - 1]);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (product) load(product, days); }, [product, days]);

    const handleProduct = (p) => {
        setProduct(p);
        setParams({ product: p });
    };

    const pctChange = (() => {
        if (history.length < 2) return null;
        const first = history[0].avg_price;
        const last = history[history.length - 1].avg_price;
        return (((last - first) / first) * 100).toFixed(1);
    })();

    return (
        <div className="page-enter">
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.3px" }}>
                Product Price History
            </h1>
            <p style={{ color: "var(--gray-500)", fontSize: 14, marginBottom: 24 }}>
                View price trends over time for any product.
            </p>

            {/* Controls */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
                <ProductSelector value={product} onChange={handleProduct} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {PERIODS.map((p) => (
                        <button
                            key={p.days}
                            onClick={() => setDays(p.days)}
                            style={{
                                padding: "8px 14px",
                                borderRadius: "var(--radius-sm)",
                                border: `1px solid ${days === p.days ? "var(--brand-600)" : "var(--gray-300)"}`,
                                background: days === p.days ? "var(--brand-600)" : "var(--surface)",
                                color: days === p.days ? "#fff" : "var(--gray-700)",
                                fontSize: 13,
                                fontWeight: days === p.days ? 600 : 400,
                                cursor: "pointer",
                                transition: "all 0.15s",
                            }}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary stats */}
            {latest && !loading && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
                    {[
                        { label: "Latest avg", value: `৳${Number(latest.avg_price).toFixed(2)}`, color: "var(--brand-600)" },
                        { label: "Latest min", value: `৳${Number(latest.min_price).toFixed(2)}`, color: "var(--green-600)" },
                        { label: "Latest max", value: `৳${Number(latest.max_price).toFixed(2)}`, color: "var(--red-600)" },
                        pctChange !== null && {
                            label: `Change (${days}d)`,
                            value: `${pctChange > 0 ? "+" : ""}${pctChange}%`,
                            color: pctChange > 0 ? "var(--red-600)" : pctChange < 0 ? "var(--green-600)" : "var(--gray-500)",
                        },
                    ].filter(Boolean).map((s) => (
                        <div key={s.label} style={{
                            background: "var(--surface)",
                            border: "1px solid var(--gray-200)",
                            borderRadius: "var(--radius-md)",
                            padding: "12px 18px",
                            boxShadow: "var(--shadow-xs)",
                            minWidth: 120,
                        }}>
                            <div style={{ fontSize: 11, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                                {s.label}
                            </div>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: s.color }}>
                                {s.value}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Chart */}
            <div style={{
                background: "var(--surface)",
                border: "1px solid var(--gray-200)",
                borderRadius: "var(--radius-md)",
                padding: "20px",
                boxShadow: "var(--shadow-xs)",
            }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--gray-700)", marginBottom: 16 }}>
                    Price trend (last {days} days)
                </div>
                {loading ? (
                    <div className="skeleton" style={{ height: 240, borderRadius: "var(--radius-md)" }} />
                ) : (
                    <TrendChart data={history} />
                )}
            </div>
        </div>
    );
}