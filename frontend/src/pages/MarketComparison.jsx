import { useState } from "react";
import { getMarketCompare } from "../api/client";
import ProductSelector from "../components/ProductSelector";

const MARKET_LABELS = {
    kawran_bazar: "Kawran Bazar",
    mirpur: "Mirpur",
    mohammadpur: "Mohammadpur",
    new_market: "New Market",
    jatrabari: "Jatrabari",
};

export default function MarketComparison() {
    const [product, setProduct] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);

    const compare = async () => {
        if (!product) return;
        setLoading(true);
        setResults([]);
        setError(null);
        try {
            const res = await getMarketCompare(product);
            // Sort cheapest first
            const sorted = [...res.data].sort((a, b) => a.avg_price - b.avg_price);
            setResults(sorted);
            setSearched(true);
        } catch (e) {
            setError("Could not load market data. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    const cheapest = results[0]?.avg_price;
    const priceFmt = (n) => Number(n).toFixed(2);

    return (
        <div className="page-enter">
            <div style={{ marginBottom: 28 }}>
                <h1 style={{
                    fontFamily: "var(--font-display)", fontSize: 26,
                    fontWeight: 700, marginBottom: 6, letterSpacing: "-0.3px",
                }}>
                    Market Comparison
                </h1>
                <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
                    Compare today's prices across all Dhaka markets. Find the cheapest.
                </p>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
                <ProductSelector value={product} onChange={setProduct} />
                <button
                    onClick={compare}
                    disabled={loading || !product}
                    style={{
                        background: loading ? "var(--gray-100)" : "var(--brand-600)",
                        color: loading ? "var(--gray-500)" : "#fff",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        padding: "9px 20px",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "background 0.15s",
                    }}
                >
                    {loading ? "Loading…" : "🏪 Compare Markets"}
                </button>
            </div>

            {error && (
                <div style={{
                    background: "var(--red-50)", border: "1px solid #fecaca",
                    borderRadius: "var(--radius-md)", padding: "12px 16px",
                    color: "var(--red-600)", fontSize: 13, marginBottom: 20,
                }}>
                    ⚠️ {error}
                </div>
            )}

            {results.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 600 }}>
                    {results.map((r, i) => {
                        const isCheapest = r.avg_price === cheapest;
                        const diff = ((r.avg_price - cheapest) / cheapest * 100).toFixed(1);
                        const label = MARKET_LABELS[r.market] || r.market;

                        return (
                            <div
                                key={r.market}
                                style={{
                                    background: isCheapest ? "var(--green-50)" : "var(--surface)",
                                    border: `1px solid ${isCheapest ? "var(--green-100)" : "var(--gray-200)"}`,
                                    borderRadius: "var(--radius-md)",
                                    padding: "16px 20px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 16,
                                    boxShadow: "var(--shadow-xs)",
                                }}
                            >
                                {/* Rank */}
                                <div style={{
                                    width: 32, height: 32,
                                    borderRadius: "50%",
                                    background: isCheapest ? "var(--green-600)" : "var(--gray-100)",
                                    color: isCheapest ? "#fff" : "var(--gray-500)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontWeight: 700, fontSize: 14, flexShrink: 0,
                                }}>
                                    {i + 1}
                                </div>

                                {/* Market name */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 15, color: "var(--gray-900)" }}>
                                        {label}
                                        {isCheapest && (
                                            <span style={{
                                                marginLeft: 8, fontSize: 11, fontWeight: 600,
                                                background: "var(--green-600)", color: "#fff",
                                                padding: "2px 8px", borderRadius: 999,
                                            }}>
                                                CHEAPEST
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>
                                        Range: ৳{priceFmt(r.min_price)} – ৳{priceFmt(r.max_price)}
                                    </div>
                                </div>

                                {/* Price */}
                                <div style={{ textAlign: "right" }}>
                                    <div style={{
                                        fontFamily: "var(--font-display)", fontSize: 22,
                                        fontWeight: 700, color: isCheapest ? "var(--green-600)" : "var(--gray-900)",
                                    }}>
                                        ৳{priceFmt(r.avg_price)}
                                    </div>
                                    {!isCheapest && (
                                        <div style={{ fontSize: 12, color: "var(--red-600)", marginTop: 2 }}>
                                            +{diff}% vs cheapest
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {searched && results.length === 0 && !loading && (
                <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
                    No market data found for this product today.
                </p>
            )}
        </div>
    );
}