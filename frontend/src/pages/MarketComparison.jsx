import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMarketCompare } from "../api/client";
import ProductSelector from "../components/ProductSelector";
import { marketLabel } from "../data/marketRegions";
import { formatProductName, getCategoryMeta, getProductCategory, getProductImage } from "../utils/productAssets";
import { bnNum, bnTk } from "../utils/banglaFormat";

export default function MarketComparison() {
    const [searchParams] = useSearchParams();
    const [product, setProduct] = useState(() => searchParams.get("product") || "");
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
            setResults([...(res.data || [])].sort((a, b) => a.avg_price - b.avg_price));
            setSearched(true);
        } catch {
            setError("বাজারের ডাটা লোড করা যায়নি। সার্ভার চালু আছে কি না দেখুন।");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchParams.get("product")) compare();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cheapest = results[0]?.avg_price;
    const meta = getCategoryMeta(getProductCategory(product));

    return (
        <div className="page-enter">
            <section className="page-hero" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) 240px", gap: 24, alignItems: "center", marginBottom: 20 }}>
                <div>

                    <h1 className="page-title">আজ কোন বাজারে দাম কম দেখুন।</h1>
                    <p className="page-subtitle">একই পণ্যের দাম কোন বাজারে কম আর কোন বাজারে বেশি — সহজে তুলনা করুন।</p>
                </div>
                {product && (
                    <div style={{ height: 210, borderRadius: 28, background: "var(--hero-bg-soft)", border: "1px solid var(--hero-border)", display: "grid", placeItems: "center", overflow: "hidden" }}>
                        <img src={getProductImage(product)} alt={formatProductName(product)} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 18, filter: "drop-shadow(0 24px 30px rgba(47, 93, 40, 0.18))" }} />
                    </div>
                )}
            </section>

            <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 19, alignItems: "center" }}>
                    <ProductSelector value={product} onChange={setProduct} />
                    <button onClick={compare} disabled={loading || !product} className="mm-btn">
                        {loading ? "লোড হচ্ছে…" : "বাজার তুলনা করুন"}
                    </button>
                    {product && <div className="product-category" style={{ marginBottom: 0 }}>{meta.icon} {meta.label}</div>}
                </div>
            </div>

            {error && <div className="alert-error" style={{ marginBottom: 20 }}> {error}</div>}

            {results.length > 0 && (
                <div className="glass-card" style={{ padding: 16 }}>
                    <div className="section-head" style={{ marginTop: 0 }}>
                        <div>
                            <h2 className="section-title">বাজার র‍্যাঙ্কিং</h2>
                            <p className="section-note">কম দাম আগে · {formatProductName(product)}</p>
                        </div>
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                        {results.map((r, i) => {
                            const isCheapest = r.avg_price === cheapest;
                            const diffPct = cheapest ? ((r.avg_price - cheapest) / cheapest * 100).toFixed(1) : "0.0";
                            const label = marketLabel(r.market);

                            return (
                                <div key={r.market} style={{
                                    background: isCheapest ? "var(--hero-success-bg)" : "var(--surface)",
                                    border: `1px solid ${isCheapest ? "var(--hero-border)" : "var(--gray-200)"}`,
                                    borderRadius: 22,
                                    padding: "14px 16px",
                                    display: "grid",
                                    gridTemplateColumns: "42px 1fr auto",
                                    alignItems: "center",
                                    gap: 14,
                                    boxShadow: "var(--shadow-sm)",
                                }}>
                                    <div style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 16,
                                        background: isCheapest ? "linear-gradient(135deg, var(--hero-heading), var(--hero-primary))" : "var(--gray-100)",
                                        color: isCheapest ? "white" : "var(--gray-500)",
                                        display: "grid",
                                        placeItems: "center",
                                        fontWeight: 950,
                                    }}>
                                        {bnNum(i + 1)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: 15, color: "var(--gray-900)" }}>
                                            {label}
                                            {isCheapest && (
                                                <span style={{ marginLeft: 8, fontSize: 14.5, background: "var(--hero-success)", color: "white", padding: "3px 8px", borderRadius: 999, fontWeight: 900 }}>
                                                    সবচেয়ে কম
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 16, color: "var(--gray-600)", marginTop: 3 }}>
                                            দামের সীমা: {bnTk(r.min_price, 2)} – {bnTk(r.max_price, 2)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 850, color: isCheapest ? "var(--gray-900)" : "var(--gray-800)", letterSpacing: -0.6 }}>
                                            {bnTk(r.avg_price, 2)}
                                        </div>
                                        {!isCheapest && (
                                            <div style={{ fontSize: 16, color: "#b91c1c", fontWeight: 800 }}>
                                                +{bnNum(diffPct)}% বেশি
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {searched && results.length === 0 && !loading && <div className="empty-state">আজ এই পণ্যের বাজার ডাটা পাওয়া যায়নি।</div>}
        </div>
    );
}