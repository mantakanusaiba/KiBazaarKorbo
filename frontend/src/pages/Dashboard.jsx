import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPricesToday } from "../api/client";
import PriceCard from "../components/PriceCard";
import { DIVISIONS, marketLabel } from "../data/marketRegions";
import {
    PRODUCT_CATEGORIES,
    formatProductName,
    getCategoryMeta,
    getProductCategory,
    getProductImage,
    productMatchesSearch,
} from "../utils/productAssets";
import { bnNum, bnTk } from "../utils/banglaFormat";

function StatCard({ label, value, icon, tone = "var(--brand-700)" }) {
    return (
        <div className="glass-card stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                    <div className="stat-label">{label}</div>
                    <div className="stat-value" style={{ color: tone }}>{value}</div>
                </div>

                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 16,
                        display: "grid",
                        placeItems: "center",
                        background: "var(--brand-50)",
                        fontSize: 21,
                    }}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function FilterSelect({ value, onChange, children, label }) {
    return (
        <label style={{ display: "grid", gap: 6 }}>
            <span
                style={{
                    fontSize: 11,
                    color: "var(--gray-500)",
                    fontWeight: 900,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                }}
            >
                {label}
            </span>

            <select className="mm-select" value={value} onChange={(e) => onChange(e.target.value)}>
                {children}
            </select>
        </label>
    );
}

function priceValue(item) {
    return Number(item?.avg_price || item?.max_price || item?.min_price || 0);
}

function PriceHighlightCard({ title, icon, item, tone }) {
    if (!item) return null;

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "112px 1fr",
                gap: 14,
                alignItems: "center",
                padding: 12,
                borderRadius: 24,
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.18)",
            }}
        >
            <div
                style={{
                    height: 104,
                    borderRadius: 20,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.22)",
                    display: "grid",
                    placeItems: "center",
                }}
            >
                <img
                    src={getProductImage(item.standard_key)}
                    alt={item.product}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        padding: 10,
                        filter: "drop-shadow(0 16px 18px rgba(0,0,0,0.2))",
                    }}
                />
            </div>

            <div>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.16)",
                        color: "rgba(255,255,255,0.9)",
                        fontSize: 11,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: 0.45,
                        marginBottom: 8,
                    }}
                >
                    {icon} {title}
                </div>

                <div
                    style={{
                        color: "white",
                        fontWeight: 950,
                        fontSize: 18,
                        lineHeight: 1.15,
                        marginBottom: 6,
                    }}
                >
                    {item.product}
                </div>

                <div
                    style={{
                        color: tone,
                        fontWeight: 950,
                        fontSize: 28,
                        letterSpacing: -0.7,
                    }}
                >
                    {bnTk(priceValue(item), 0)}
                    <span
                        style={{
                            color: "rgba(255,255,255,0.72)",
                            fontSize: 12,
                            marginLeft: 5,
                            fontWeight: 800,
                        }}
                    >
                        গড়
                    </span>
                </div>

                <div
                    style={{
                        color: "rgba(255,255,255,0.72)",
                        fontSize: 12,
                        fontWeight: 700,
                        marginTop: 4,
                    }}
                >
                    দামের সীমা: {bnTk(item.min_price || 0, 0)} - {bnTk(item.max_price || 0, 0)}
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [divisionId, setDivisionId] = useState("all");
    const [marketKey, setMarketKey] = useState("all");
    const [query, setQuery] = useState("");
    const [categoryId, setCategoryId] = useState("all");

    const navigate = useNavigate();

    useEffect(() => {
        getPricesToday()
            .then((r) => setPrices(r.data || []))
            .catch(() => setError("দামের ডাটা লোড করা যায়নি। সার্ভার চালু আছে কি না দেখুন।"))
            .finally(() => setLoading(false));
    }, []);

    const availableMarketKeys = useMemo(() => new Set(prices.map((p) => p.market)), [prices]);

    const marketsForDivision = useMemo(() => {
        if (divisionId === "all") return [];

        const div = DIVISIONS.find((d) => d.id === divisionId);
        return (div?.markets || []).filter((m) => availableMarketKeys.has(m.key));
    }, [divisionId, availableMarketKeys]);

    const handleDivisionChange = (id) => {
        setDivisionId(id);
        setMarketKey("all");
    };

    const divisionMarketKeys = useMemo(() => {
        if (divisionId === "all") return null;

        return new Set(
            (DIVISIONS.find((d) => d.id === divisionId)?.markets || []).map((m) => m.key)
        );
    }, [divisionId]);

    const aggregatedItems = useMemo(() => {
        const filtered = prices.filter((p) => {
            if (marketKey !== "all") return p.market === marketKey;
            if (divisionMarketKeys) return divisionMarketKeys.has(p.market);
            return true;
        });

        const byProduct = {};

        filtered.forEach((p) => {
            const key = p.standard_key;
            if (!key) return;

            if (!byProduct[key]) {
                byProduct[key] = {
                    ...p,
                    standard_key: key,
                    product: formatProductName(key),
                    avg_price: Number(p.avg_price) || 0,
                    min_price: Number(p.min_price) || 0,
                    max_price: Number(p.max_price) || 0,
                    count: 1,
                };
            } else {
                byProduct[key].avg_price += Number(p.avg_price) || 0;
                byProduct[key].min_price = Math.min(
                    byProduct[key].min_price,
                    Number(p.min_price) || byProduct[key].min_price
                );
                byProduct[key].max_price = Math.max(
                    byProduct[key].max_price,
                    Number(p.max_price) || byProduct[key].max_price
                );
                byProduct[key].count++;
            }
        });

        return Object.values(byProduct).map((v) => ({
            ...v,
            avg_price: +(v.avg_price / v.count).toFixed(2),
            category: getProductCategory(v.standard_key),
        }));
    }, [prices, marketKey, divisionMarketKeys]);

    const priceHighlights = useMemo(() => {
        const validItems = aggregatedItems.filter((item) => priceValue(item) > 0);

        if (validItems.length === 0) {
            return {
                highest: null,
                lowest: null,
            };
        }

        const sorted = [...validItems].sort((a, b) => priceValue(b) - priceValue(a));

        return {
            highest: sorted[0],
            lowest: sorted[sorted.length - 1],
        };
    }, [aggregatedItems]);

    const items = useMemo(() => {
        return aggregatedItems
            .filter((p) => categoryId === "all" || p.category === categoryId)
            .filter((p) => productMatchesSearch(p.standard_key, p.product, query))
            .sort((a, b) => a.product.localeCompare(b.product, "bn"));
    }, [aggregatedItems, categoryId, query]);

    const categoryCounts = useMemo(() => {
        const counts = { all: aggregatedItems.length };

        aggregatedItems.forEach((p) => {
            counts[p.category] = (counts[p.category] || 0) + 1;
        });

        return counts;
    }, [aggregatedItems]);

    const filteredRows = useMemo(() => {
        return prices.filter((p) => {
            if (marketKey !== "all") return p.market === marketKey;
            if (divisionMarketKeys) return divisionMarketKeys.has(p.market);
            return true;
        });
    }, [prices, marketKey, divisionMarketKeys]);

    const marketsInView = new Set(filteredRows.map((p) => p.market)).size;

    const scopeLabel =
        marketKey !== "all"
            ? marketLabel(marketKey)
            : divisionId !== "all"
                ? `${DIVISIONS.find((d) => d.id === divisionId)?.name} বিভাগ`
                : "বাংলাদেশের সব বাজার";

    if (loading) {
        return (
            <div className="page-enter">
                <div className="skeleton" style={{ height: 250, borderRadius: 34, marginBottom: 20 }} />

                <div className="product-grid">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 286, borderRadius: 26 }} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert-error">
                <b>⚠️ কানেকশন সমস্যা</b>
                <br />
                {error}
            </div>
        );
    }

    return (
        <div className="page-enter">
            <section
                className="page-hero"
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.12fr) minmax(340px, 0.88fr)",
                    gap: 26,
                    alignItems: "center",
                }}
            >
                <div>
                    <div className="hero-kicker">🌿 আজকের বাজারের স্মার্ট তথ্য</div>

                    <h1 className="page-title">বাংলাদেশের বাজার দাম দেখে স্মার্টভাবে কেনাকাটা করুন।</h1>

                    <p className="page-subtitle">
                        পণ্য খুঁজুন, বিভাগ বা বাজার বাছুন, দাম তুলনা করুন এবং কম খরচে বাজারের লিস্ট বানান।
                    </p>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
                        <button className="mm-btn" onClick={() => navigate("/basket")}>
                            🛒 বাজার লিস্ট বানান
                        </button>

                        <button className="mm-btn secondary" onClick={() => navigate("/forecast")}>
                            📈 দাম ফোরকাস্ট দেখুন
                        </button>
                    </div>
                </div>

                <div
                    className="glass-card"
                    style={{
                        padding: 16,
                        background: "rgba(255,255,255,0.16)",
                        borderColor: "rgba(255,255,255,0.20)",
                    }}
                >
                    <div
                        style={{
                            color: "white",
                            fontWeight: 950,
                            fontSize: 18,
                            marginBottom: 12,
                            letterSpacing: -0.3,
                        }}
                    >
                        আজকের সবচেয়ে বেশি ও কম দাম
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                        <PriceHighlightCard
                            title="আজ সবচেয়ে বেশি দাম"
                            icon="📈"
                            item={priceHighlights.highest}
                            tone="#fde68a"
                        />

                        <PriceHighlightCard
                            title="আজ সবচেয়ে কম দাম"
                            icon="📉"
                            item={priceHighlights.lowest}
                            tone="#bbf7d0"
                        />
                    </div>
                </div>
            </section>

            <section className="glass-card filter-panel">
                <label style={{ display: "grid", gap: 6 }}>
                    <span
                        style={{
                            fontSize: 11,
                            color: "var(--gray-500)",
                            fontWeight: 900,
                            letterSpacing: 0.6,
                            textTransform: "uppercase",
                        }}
                    >
                        পণ্য খুঁজুন
                    </span>

                    <input
                        className="mm-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="যেমন: চাল, ডিম, পেঁয়াজ, মুরগি..."
                    />
                </label>

                <FilterSelect label="বিভাগ" value={divisionId} onChange={handleDivisionChange}>
                    <option value="all">সব বিভাগ</option>
                    {DIVISIONS.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name}
                        </option>
                    ))}
                </FilterSelect>

                <FilterSelect label="বাজার" value={marketKey} onChange={setMarketKey}>
                    <option value="all">
                        {divisionId === "all" ? "সব বাজার" : "এই বিভাগের সব বাজার"}
                    </option>

                    {marketsForDivision.map((m) => (
                        <option key={m.key} value={m.key}>
                            {m.label}
                        </option>
                    ))}
                </FilterSelect>
            </section>

            <div className="stats-grid" style={{ marginTop: 16 }}>
                <StatCard label="দেখানো পণ্য" value={bnNum(items.length)} icon="🧺" />
                <StatCard label="দেখানো বাজার" value={bnNum(marketsInView)} icon="📍" />
                <StatCard label="এখন দেখা হচ্ছে" value={scopeLabel} icon="🌎" tone="var(--gray-900)" />
            </div>

            <div className="section-head">
                <div>
                    <h2 className="section-title">ক্যাটাগরি দিয়ে দেখুন</h2>
                    <p className="section-note">
                        পণ্য খোঁজা, বিভাগ ও বাজার ফিল্টারের সাথে এই ক্যাটাগরি ফিল্টার একসাথে কাজ করবে।
                    </p>
                </div>
            </div>

            <div className="category-strip">
                {PRODUCT_CATEGORIES.map((c) => (
                    <button
                        key={c.id}
                        className={`category-chip ${categoryId === c.id ? "active" : ""}`}
                        onClick={() => setCategoryId(c.id)}
                    >
                        <span>{c.icon}</span>
                        {c.label}
                        <span style={{ opacity: 0.72 }}>({bnNum(categoryCounts[c.id] || 0)})</span>
                    </button>
                ))}
            </div>

            <div className="section-head">
                <div>
                    <h2 className="section-title">আজকের পণ্য</h2>
                    <p className="section-note">
                        {bnNum(items.length)}টি ফলাফল · {scopeLabel}
                    </p>
                </div>

                {categoryId !== "all" && (
                    <div className="product-category" style={{ marginBottom: 0 }}>
                        {getCategoryMeta(categoryId).icon} {getCategoryMeta(categoryId).label}
                    </div>
                )}
            </div>

            {items.length === 0 ? (
                <div className="empty-state">
                    এই খোঁজা/ফিল্টারে কোনো পণ্য পাওয়া যায়নি। অন্য ক্যাটাগরি বা বাজার দিয়ে চেষ্টা করুন।
                </div>
            ) : (
                <div className="product-grid">
                    {items.map((p) => (
                        <PriceCard
                            key={p.standard_key}
                            productKey={p.standard_key}
                            product={p.product}
                            market={marketKey !== "all" ? marketLabel(p.market) : undefined}
                            min={p.min_price}
                            max={p.max_price}
                            avg={p.avg_price}
                            unit={p.unit}
                            onClick={() => navigate(`/search?product=${p.standard_key}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}