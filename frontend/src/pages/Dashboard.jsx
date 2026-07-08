import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCachedPricesTodayData, getPricesToday } from "../api/client";
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

function StatCard({ label, value, tone = "var(--brand-700)" }) {
    return (
        <div className="glass-card stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                    <div className="stat-label">{label}</div>
                    <div className="stat-value" style={{ color: tone }}>
                        {value}
                    </div>
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

const UNIT_LABELS_BN = {
    kg: "কেজি",
    kgs: "কেজি",
    kilogram: "কেজি",
    kilograms: "কেজি",

    gram: "গ্রাম",
    grams: "গ্রাম",
    gm: "গ্রাম",
    g: "গ্রাম",

    liter: "লিটার",
    liters: "লিটার",
    litre: "লিটার",
    litres: "লিটার",
    l: "লিটার",

    dozen: "ডজন",
    dz: "ডজন",

    piece: "পিস",
    pieces: "পিস",
    pcs: "পিস",
    pc: "পিস",
};

function toBanglaDigits(value = "") {
    return String(value).replace(/[0-9]/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
}

function formatUnit(unit) {
    if (!unit) return "কেজি";

    const raw = String(unit).trim();
    const key = raw.toLowerCase().replace(/\s+/g, "");

    const literMatch = key.match(/^(\d+(?:\.\d+)?)(l|liter|litre|liters|litres)$/);
    if (literMatch) {
        return `${toBanglaDigits(literMatch[1])} লিটার`;
    }

    const gramMatch = key.match(/^(\d+(?:\.\d+)?)(g|gm|gram|grams)$/);
    if (gramMatch) {
        return `${toBanglaDigits(gramMatch[1])} গ্রাম`;
    }

    const kgMatch = key.match(/^(\d+(?:\.\d+)?)(kg|kgs|kilogram|kilograms)$/);
    if (kgMatch) {
        return `${toBanglaDigits(kgMatch[1])} কেজি`;
    }

    const pieceMatch = key.match(/^(\d+(?:\.\d+)?)(pc|pcs|piece|pieces)$/);
    if (pieceMatch) {
        return `${toBanglaDigits(pieceMatch[1])} পিস`;
    }

    const dozenMatch = key.match(/^(\d+(?:\.\d+)?)(dozen|dz)$/);
    if (dozenMatch) {
        return `${toBanglaDigits(dozenMatch[1])} ডজন`;
    }

    return UNIT_LABELS_BN[key] || toBanglaDigits(raw);
}

function computeTrend(item) {
    const min = Number(item?.min_price) || 0;
    const max = Number(item?.max_price) || 0;
    const avg = Number(item?.avg_price) || 0;

    const mid = (min + max) / 2;
    const diff = avg - mid;

    if (!mid || Math.abs(diff) < mid * 0.03) {
        return { type: "stable", diff: 0 };
    }

    return { type: diff > 0 ? "up" : "down", diff: Math.abs(diff) };
}

function HeroProductCard({ item }) {
    if (!item) {
        return (
            <div
                style={{
                    minHeight: 240,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 26,
                    background: "var(--hero-card)",
                    border: "1px solid var(--hero-border)",
                    color: "var(--hero-text-light)",
                    fontWeight: 800,
                    textAlign: "center",
                    padding: 20,
                }}
            >
                আজকের বিশেষ দাম লোড হচ্ছে...
            </div>
        );
    }

    const trend = computeTrend(item);
    const percent = item.avg_price ? Math.round((trend.diff / item.avg_price) * 100) : 0;

    const trendMeta = {
        up: {
            icon: "⬆",
            color: "#b91c1c",
            background: "#fee2e2",
            text: `গতকালের তুলনায় ${bnNum(percent)}% বেশি`,
        },
        down: {
            icon: "⬇",
            color: "var(--hero-success)",
            background: "var(--hero-success-bg)",
            text: `গতকালের তুলনায় ${bnNum(percent)}% কম`,
        },
        stable: {
            icon: "➡",
            color: "var(--hero-text)",
            background: "var(--hero-bg-soft)",
            text: "দাম স্থিতিশীল",
        },
    }[trend.type];

    return (
        <div
            key={item.standard_key}
            style={{
                display: "grid",
                gridTemplateColumns: "150px 1fr",
                gap: 18,
                alignItems: "center",
                padding: 18,
                borderRadius: 26,
                background: "var(--hero-card)",
                border: "1px solid var(--hero-border)",
                boxShadow: "0 12px 30px rgba(47, 93, 40, 0.08)",
                animation: "fadeSlide .35s ease",
                height: 260,
                boxSizing: "border-box",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    width: 150,
                    height: 150,
                    borderRadius: 18,
                    overflow: "hidden",
                    background: "var(--hero-bg-soft)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                }}
            >
                <img
                    src={getProductImage(item.standard_key)}
                    alt={item.product}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        padding: 12,
                    }}
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                    }}
                />
            </div>

            <div
                style={{
                    minWidth: 0,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                }}
            >
                <h2
                    style={{
                        color: "var(--hero-heading)",
                        marginTop: 0,
                        marginBottom: 6,
                        fontWeight: 900,
                        fontSize: 26,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {item.product}
                </h2>

                <div
                    style={{
                        color: "var(--hero-text-light)",
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 2,
                    }}
                >
                    আজকের দাম
                </div>

                <div
                    style={{
                        color: "var(--hero-price)",
                        fontWeight: 900,
                        fontSize: 36,
                        lineHeight: 1.1,
                    }}
                >
                    {bnTk(item.avg_price, 0)}
                    <span
                        style={{
                            fontSize: 14,
                            color: "var(--hero-text-light)",
                            fontWeight: 700,
                            marginLeft: 8,
                        }}
                    >
                        /{formatUnit(item.unit)}
                    </span>
                </div>

                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 8,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: trendMeta.background,
                        color: trendMeta.color,
                        fontWeight: 800,
                        fontSize: 12,
                        width: "fit-content",
                    }}
                >
                    <span>{trendMeta.icon}</span>
                    <span>{trendMeta.text}</span>
                </div>

                <div
                    style={{
                        color: "var(--hero-text-light)",
                        fontSize: 12,
                        fontWeight: 700,
                        marginTop: 6,
                    }}
                >
                    রেঞ্জ: {bnTk(item.min_price, 0)} – {bnTk(item.max_price, 0)}
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const cachedPrices = getCachedPricesTodayData();

    const [prices, setPrices] = useState(cachedPrices || []);
    const [loading, setLoading] = useState(!cachedPrices);
    const [error, setError] = useState(null);
    const [divisionId, setDivisionId] = useState("all");
    const [marketKey, setMarketKey] = useState("all");
    const [query, setQuery] = useState("");
    const [categoryId, setCategoryId] = useState("all");
    const [currentSlide, setCurrentSlide] = useState(0);

    const navigate = useNavigate();

    useEffect(() => {
        let alive = true;

        const cached = getCachedPricesTodayData();

        if (cached && cached.length > 0) {
            setPrices(cached);
            setLoading(false);
        } else {
            setLoading(true);
        }

        setError(null);

        getPricesToday()
            .then((r) => {
                const rows = Array.isArray(r.data)
                    ? r.data
                    : Array.isArray(r.data?.data)
                        ? r.data.data
                        : [];

                console.log("Dashboard prices loaded:", rows.length);
                console.log("First dashboard row:", rows[0]);

                if (alive) {
                    setPrices(rows);
                }
            })
            .catch((err) => {
                console.error("Dashboard price load failed:", err);

                if (alive && (!cached || cached.length === 0)) {
                    setError(
                        `দামের ডাটা লোড করা যায়নি। Backend জেগে উঠতে সময় নিতে পারে। Error: ${err?.message || "unknown"}`
                    );
                }
            })
            .finally(() => {
                if (alive) {
                    setLoading(false);
                }
            });

        return () => {
            alive = false;
        };
    }, []);

    const availableMarketKeys = useMemo(() => {
        return new Set(prices.map((p) => p.market).filter(Boolean));
    }, [prices]);

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

            const avgPrice = Number(p.avg_price) || 0;
            const minPrice = Number(p.min_price) || avgPrice || 0;
            const maxPrice = Number(p.max_price) || avgPrice || 0;

            if (!byProduct[key]) {
                byProduct[key] = {
                    ...p,
                    standard_key: key,
                    product: formatProductName(key),
                    avg_price: avgPrice,
                    min_price: minPrice,
                    max_price: maxPrice,
                    unit: p.unit,
                    count: 1,
                };
            } else {
                byProduct[key].avg_price += avgPrice;

                if (minPrice > 0) {
                    byProduct[key].min_price =
                        byProduct[key].min_price > 0
                            ? Math.min(byProduct[key].min_price, minPrice)
                            : minPrice;
                }

                if (maxPrice > 0) {
                    byProduct[key].max_price = Math.max(byProduct[key].max_price, maxPrice);
                }

                if (!byProduct[key].unit && p.unit) {
                    byProduct[key].unit = p.unit;
                }

                byProduct[key].count++;
            }
        });

        return Object.values(byProduct).map((v) => ({
            ...v,
            avg_price: +(v.avg_price / v.count).toFixed(2),
            category: getProductCategory(v.standard_key),
        }));
    }, [prices, marketKey, divisionMarketKeys]);

    const heroSlides = useMemo(() => {
        return aggregatedItems
            .filter((item) => priceValue(item) > 0)
            .sort((a, b) => priceValue(b) - priceValue(a))
            .slice(0, 8);
    }, [aggregatedItems]);

    useEffect(() => {
        if (currentSlide >= heroSlides.length) {
            setCurrentSlide(0);
        }
    }, [heroSlides, currentSlide]);

    useEffect(() => {
        if (heroSlides.length <= 1) return undefined;

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
        }, 1500);

        return () => clearInterval(timer);
    }, [heroSlides]);

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

    const marketsInView = useMemo(() => {
        return new Set(filteredRows.map((p) => p.market).filter(Boolean)).size;
    }, [filteredRows]);

    const scopeLabel =
        marketKey !== "all"
            ? marketLabel(marketKey)
            : divisionId !== "all"
                ? `${DIVISIONS.find((d) => d.id === divisionId)?.name} বিভাগ`
                : "বাংলাদেশের সব বাজার";

   if (loading) {
    return (
        <div className="page-enter">
            <div className="dashboard-loader-card glass-card">
                <h2 className="section-title">ড্যাশবোর্ড লোড হচ্ছে...</h2>

                <p className="section-note dashboard-loader-text">
                    সিস্টেমটি সম্পূর্ণভাবে সচল হতে কিছুটা সময় লাগছে। অনুগ্রহ করে অপেক্ষা করুন।
                </p>

                <div className="dashboard-loader-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    );
}
    if (error) {
        return (
            <div className="page-enter">
                <div className="alert-error">
                    <b>⚠️ কানেকশন সমস্যা</b>
                    <br />
                    {error}
                    <br />
                    <br />
                    <button className="mm-btn" onClick={() => window.location.reload()}>
                        আবার চেষ্টা করুন
                    </button>
                </div>
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
                    <h1 className="page-title">
                        বাংলাদেশের বাজার দাম দেখে স্মার্টভাবে কেনাকাটা করুন।
                    </h1>

                    <p className="page-subtitle">
                        গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের কৃষি সেবা পোর্টালের ডাটা ব্যবহার করে পণ্য খুঁজুন, দাম তুলনা করুন এবং কম খরচে বাজারের লিস্ট বানান।
                    </p>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
                        <button className="mm-btn" onClick={() => navigate("/basket")}>
                            বাজার লিস্ট বানান
                        </button>

                        <button className="mm-btn secondary" onClick={() => navigate("/forecast")}>
                            দাম ফোরকাস্ট দেখুন
                        </button>
                    </div>
                </div>

                <div
                    style={{
                        padding: 20,
                        borderRadius: 30,
                        background: "var(--hero-bg-soft)",
                        border: "1px solid var(--hero-border)",
                        position: "relative",
                    }}
                >
                    <div
                        style={{
                            color: "var(--hero-heading)",
                            fontWeight: 900,
                            fontSize: 20,
                            marginBottom: 15,
                        }}
                    >
                        আজকের বাজারের বিশেষ দাম
                    </div>

                    <div style={{ position: "relative" }}>
                        <HeroProductCard item={heroSlides[currentSlide]} />
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
                <StatCard label="দেখানো পণ্য" value={bnNum(items.length)} />
                <StatCard label="দেখানো বাজার" value={bnNum(marketsInView)} />
                <StatCard label="এখন দেখা হচ্ছে" value={scopeLabel} tone="var(--gray-900)" />
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
                        <span style={{ opacity: 0.72 }}>
                            ({bnNum(categoryCounts[c.id] || 0)})
                        </span>
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