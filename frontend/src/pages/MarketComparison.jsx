import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMarketCompare } from "../api/client";
import ProductSelector from "../components/ProductSelector";
import { marketLabel } from "../data/marketRegions";
import { formatProductName, getCategoryMeta, getProductCategory, getProductImage } from "../utils/productAssets";

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
            setError("বাজারের ডাটা লোড করা যায়নি। সার্ভার চালু আছে কি না দেখুন।");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchParams.get("product")) compare();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cheapest = results[0]?.avg_price;
    const priceFmt = (n) => Number(n).toFixed(2);
    const meta = getCategoryMeta(getProductCategory(product));

    return (
        <div className="page-enter">
            <section className="page-hero" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) 240px", gap: 24, alignItems: "center", marginBottom: 20 }}>
                <div>
                    <div className="hero-kicker">📍 বাজার তুলনা</div>
                    <h1 className="page-title">আজ কোন বাজারে দাম কম দেখুন।</h1>
                    <p className="page-subtitle">একই পণ্যের দাম কোন বাজারে কম আর কোন বাজারে বেশি — সহজে তুলনা করুন।</p>
                </div>
                {product && (
                    <div style={{ height: 210, borderRadius: 28, background: "rgba(255,255,255,0.18)", display: "grid", placeItems: "center", overflow: "hidden" }}>
                        <img src={getProductImage(product)} alt={formatProductName(product)} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 18, filter: "drop-shadow(0 24px 30px rgba(0,0,0,0.22))" }} />
                    </div>
                )}
            </section>

            <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <ProductSelector value={product} onChange={setProduct} />
                    <button onClick={compare} disabled={loading || !product} className="mm-btn">
                        {loading ? "লোড হচ্ছে…" : "🏪 বাজার তুলনা করুন"}
                    </button>
                    {product && <div className="product-category" style={{ marginBottom: 0 }}>{meta.icon} {meta.label}</div>}
                </div>
            </div>

            {error && <div className="alert-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

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
                            const diff = cheapest ? ((r.avg_price - cheapest) / cheapest * 100).toFixed(1) : "0.0";
                            const label = marketLabel(r.market);

                            return (
                                <div key={r.market} style={{
                                    background: isCheapest ? "linear-gradient(135deg, var(--green-50), white)" : "white",
                                    border: `1px solid ${isCheapest ? "var(--green-100)" : "var(--gray-200)"}`,
                                    borderRadius: 22,
                                    padding: "14px 16px",
                                    display: "grid",
                                    gridTemplateColumns: "42px 1fr auto",
                                    alignItems: "center",
                                    gap: 14,
                                    boxShadow: "var(--shadow-xs)",
                                }}>
                                    <div style={{ width: 42, height: 42, borderRadius: 16, background: isCheapest ? "linear-gradient(135deg, #047857, #10b981)" : "var(--gray-100)", color: isCheapest ? "white" : "var(--gray-500)", display: "grid", placeItems: "center", fontWeight: 950 }}>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 950, fontSize: 15, color: "var(--gray-900)" }}>
                                            {label}
                                            {isCheapest && <span style={{ marginLeft: 8, fontSize: 10.5, background: "var(--green-600)", color: "white", padding: "3px 8px", borderRadius: 999, fontWeight: 950 }}>সবচেয়ে কম</span>}
                                        </div>
                                        <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 3 }}>দামের সীমা: ৳{priceFmt(r.min_price)} – ৳{priceFmt(r.max_price)}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 950, color: isCheapest ? "var(--green-700)" : "var(--gray-900)", letterSpacing: -0.6 }}>৳{priceFmt(r.avg_price)}</div>
                                        {!isCheapest && <div style={{ fontSize: 12, color: "var(--red-600)", fontWeight: 850 }}>+{diff}% বেশি</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {searched && results.length === 0 && !loading && <div className="empty-state">আজ এই পণ্যের বাজার ডাটা পাওয়া যায়নি।</div>}
        </div>
    );
}
