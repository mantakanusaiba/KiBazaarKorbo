import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getPriceHistory } from "../api/client";
import ProductSelector from "../components/ProductSelector";
import TrendChart from "../components/TrendChart";
import {
    formatProductName,
    getCategoryMeta,
    getProductCategory,
    getProductImage,
} from "../utils/productAssets";
import { bnNum, bnPct, bnTk } from "../utils/banglaFormat";

const PERIODS = [
    { label: "৩০ দিন", days: 30 },
    { label: "৬০ দিন", days: 60 },
    { label: "৯০ দিন", days: 90 },
    { label: "৬ মাস", days: 180 },
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
                const rows = r.data || [];
                setHistory(rows);
                setLatest(rows.length ? rows[rows.length - 1] : null);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (product) load(product, days);
    }, [product, days]);

    const handleProduct = (p) => {
        setProduct(p);
        setParams({ product: p });
    };

    const pctChange = (() => {
        if (history.length < 2) return null;

        const first = Number(history[0].avg_price || 0);
        const last = Number(history[history.length - 1].avg_price || 0);

        if (!first) return null;

        return ((last - first) / first) * 100;
    })();

    const meta = product ? getCategoryMeta(getProductCategory(product)) : null;

    return (
        <div className="page-enter">
            <section
                className="page-hero"
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.1fr) 240px",
                    gap: 24,
                    alignItems: "center",
                    marginBottom: 20,
                }}
            >
                <div>
                    <div className="hero-kicker">🔎 পণ্যের দাম বিশ্লেষণ</div>

                    <h1 className="page-title">কেনার আগে আগের দাম দেখে নিন।</h1>

                    <p className="page-subtitle">
                        যেকোনো পণ্য বাছুন। সাম্প্রতিক দাম, সর্বনিম্ন-সর্বোচ্চ দাম আর ট্রেন্ড দেখুন।
                    </p>
                </div>

                {product && (
                    <div
                        style={{
                            height: 210,
                            borderRadius: 28,
                            background: "rgba(255,255,255,0.18)",
                            display: "grid",
                            placeItems: "center",
                            overflow: "hidden",
                        }}
                    >
                        <img
                            src={getProductImage(product)}
                            alt={formatProductName(product)}
                            style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                width: "auto",
                                height: "auto",
                                objectFit: "contain",
                                padding: 18,
                                filter: "drop-shadow(0 24px 30px rgba(0,0,0,0.22))",
                            }}
                        />
                    </div>
                )}
            </section>

            <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        alignItems: "center",
                    }}
                >
                    <ProductSelector value={product} onChange={handleProduct} />

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {PERIODS.map((p) => (
                            <button
                                key={p.days}
                                onClick={() => setDays(p.days)}
                                className={`category-chip ${days === p.days ? "active" : ""}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {product && meta && (
                        <div className="product-category" style={{ marginBottom: 0 }}>
                            {meta.icon} {meta.label}
                        </div>
                    )}
                </div>
            </div>

            {latest && !loading && (
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                    <Stat
                        label="সর্বশেষ গড়"
                        value={bnTk(latest.avg_price, 2)}
                        tone="var(--brand-700)"
                    />

                    <Stat
                        label="সর্বশেষ সর্বনিম্ন"
                        value={bnTk(latest.min_price, 2)}
                        tone="var(--gray-900)"
                    />

                    <Stat
                        label="সর্বশেষ সর্বোচ্চ"
                        value={bnTk(latest.max_price, 2)}
                        tone="var(--red-600)"
                    />

                    {pctChange !== null && (
                        <Stat
                            label={`পরিবর্তন (${bnNum(days)} দিন)`}
                            value={`${pctChange > 0 ? "+" : ""}${bnPct(pctChange, 1)}`}
                            tone={
                                pctChange > 0
                                    ? "var(--red-600)"
                                    : pctChange < 0
                                      ? "var(--green-600)"
                                      : "var(--gray-500)"
                            }
                        />
                    )}
                </div>
            )}

            <div className="glass-card" style={{ padding: 22 }}>
                <div className="section-head" style={{ marginTop: 0 }}>
                    <div>
                        <h2 className="section-title">দামের ট্রেন্ড</h2>

                        <p className="section-note">
                            শেষ {bnNum(days)} দিন ·{" "}
                            {product ? formatProductName(product) : "একটি পণ্য বাছুন"}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div
                        className="skeleton"
                        style={{
                            height: 280,
                            borderRadius: 20,
                        }}
                    />
                ) : (
                    <TrendChart data={history} />
                )}
            </div>
        </div>
    );
}

function Stat({ label, value, tone }) {
    return (
        <div className="glass-card stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color: tone }}>
                {value}
            </div>
        </div>
    );
}