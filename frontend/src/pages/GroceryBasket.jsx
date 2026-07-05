import { useEffect, useMemo, useRef, useState } from "react";
import { getProducts, getPricesToday, optimizeBasket } from "../api/client";
import BasketPlanSummary from "../components/BasketPlanSummary";
import BasketInsights from "../components/BasketInsights";
import ShoppingPlanList from "../components/ShoppingPlanList";
import MarketRankingCards from "../components/MarketRankingCards";
import { DIVISIONS } from "../data/marketRegions";
import {
    PRODUCT_CATEGORIES,
    formatProductName,
    formatUnit,
    getProductCategory,
    getProductImage,
    productMatchesSearch,
    translateApiText,
} from "../utils/productAssets";
import { bnNum, bnTk } from "../utils/banglaFormat";

const STORAGE_KEY = "mm_basket";
const DIVISION_STORAGE_KEY = "mm_basket_division";

const UNIT_STEP = {
    kg: 0.5,
    litre: 0.5,
    piece: 1,
    default: 1,
};

function loadBasket() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveBasket(basket) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(basket));
    } catch {
        /* ignore */
    }
}

function loadDivision() {
    try {
        return localStorage.getItem(DIVISION_STORAGE_KEY) || "all";
    } catch {
        return "all";
    }
}

function saveDivision(divisionId) {
    try {
        localStorage.setItem(DIVISION_STORAGE_KEY, divisionId);
    } catch {
        /* ignore */
    }
}

function buildPriceMap(rows, markets) {
    const allowedMarkets = markets?.length ? new Set(markets) : null;
    const byProduct = {};

    rows.forEach((p) => {
        if (!p?.standard_key || p.avg_price == null) return;
        if (allowedMarkets && !allowedMarkets.has(p.market)) return;

        const key = p.standard_key;

        if (!byProduct[key]) {
            byProduct[key] = {
                total: Number(p.avg_price),
                count: 1,
                unit: p.unit,
                product_en: formatProductName(key),
            };
        } else {
            byProduct[key].total += Number(p.avg_price);
            byProduct[key].count += 1;
        }
    });

    const priceMap = {};

    Object.entries(byProduct).forEach(([key, v]) => {
        priceMap[key] = {
            avg: +(v.total / v.count).toFixed(2),
            unit: v.unit,
            product_en: v.product_en,
            category: getProductCategory(key),
        };
    });

    return priceMap;
}

export default function GroceryBasket() {
    const [products, setProducts] = useState([]);
    const [priceRows, setPriceRows] = useState([]);
    const [basket, setBasket] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [plan, setPlan] = useState(null);
    const [planLoading, setPlanLoading] = useState(false);
    const [planError, setPlanError] = useState(null);
    const [divisionId, setDivisionId] = useState("all");
    const [query, setQuery] = useState("");
    const [categoryId, setCategoryId] = useState("all");

    const resultRef = useRef(null);

    useEffect(() => {
        setBasket(loadBasket());
        setDivisionId(loadDivision());

        Promise.all([getProducts(), getPricesToday()])
            .then(([prodRes, priceRes]) => {
                setProducts(prodRes.data || []);
                setPriceRows(priceRes.data || []);
            })
            .catch(() => setError("দামের ডাটা লোড করা যায়নি। সার্ভার চালু আছে কি না দেখুন।"))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (plan && resultRef.current) {
            setTimeout(() => {
                resultRef.current.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 120);
        }
    }, [plan]);

    const updateQty = (key, qty) => {
        const next = { ...basket };

        if (qty <= 0) {
            delete next[key];
        } else {
            next[key] = qty;
        }

        setBasket(next);
        saveBasket(next);
        setPlan(null);
    };

    const step = (unit) => UNIT_STEP[unit] || UNIT_STEP.default;

    const clearBasket = () => {
        setBasket({});
        saveBasket({});
        setPlan(null);
        setPlanError(null);
    };

    const handleDivisionChange = (id) => {
        setDivisionId(id);
        saveDivision(id);
        setPlan(null);
        setPlanError(null);
    };

    const selectedDivision = DIVISIONS.find((d) => d.id === divisionId);

    const marketsForDivision =
        divisionId === "all"
            ? undefined
            : (selectedDivision?.markets || []).map((m) => m.key);

    const prices = useMemo(
        () => buildPriceMap(priceRows, marketsForDivision),
        [priceRows, marketsForDivision]
    );

    const availableProducts = useMemo(
        () => products.filter((key) => prices[key]),
        [products, prices]
    );

    const visibleProducts = useMemo(() => {
        return availableProducts
            .filter((key) => categoryId === "all" || prices[key]?.category === categoryId)
            .filter((key) =>
                productMatchesSearch(
                    key,
                    prices[key]?.product_en || formatProductName(key),
                    query
                )
            )
            .sort((a, b) =>
                (prices[a]?.product_en || a).localeCompare(prices[b]?.product_en || b)
            );
    }, [availableProducts, categoryId, prices, query]);

    const categoryCounts = useMemo(() => {
        const counts = { all: availableProducts.length };

        availableProducts.forEach((key) => {
            const c = prices[key]?.category || "other";
            counts[c] = (counts[c] || 0) + 1;
        });

        return counts;
    }, [availableProducts, prices]);

    const items = Object.entries(basket)
        .filter(([key]) => prices[key])
        .map(([key, qty]) => {
            const p = prices[key];

            return {
                key,
                qty,
                unit: p.unit,
                product_en: p.product_en,
                unitPrice: p.avg,
                lineTotal: +(p.avg * qty).toFixed(2),
            };
        });

    const hiddenBasketCount = Object.keys(basket).length - items.length;

    const total = items.reduce((sum, i) => sum + i.lineTotal, 0);

    const runOptimizer = () => {
        const payload = items.map((item) => ({
            product: item.key,
            qty: item.qty,
        }));

        if (payload.length === 0) return;

        setPlanLoading(true);
        setPlanError(null);
        setPlan(null);

        optimizeBasket(payload, marketsForDivision)
            .then((res) => setPlan(res.data))
            .catch(() => setPlanError("সেরা বাজার প্ল্যান বের করা যায়নি। আবার চেষ্টা করুন।"))
            .finally(() => setPlanLoading(false));
    };

    if (loading) {
        return (
            <div className="page-enter">
                <div
                    className="skeleton"
                    style={{
                        height: 240,
                        borderRadius: 34,
                        marginBottom: 20,
                    }}
                />

                <div className="basket-product-grid">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div
                            key={i}
                            className="skeleton"
                            style={{
                                height: 166,
                                borderRadius: 20,

                            }}
                        />
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
            <section className="page-hero" style={{ marginBottom: 20 }}>


                <h1 className="page-title">
                    বাজারের লিস্ট বানান, কম দামের বাজার থেকে কিনুন।
                </h1>

                <p className="page-subtitle">
                    পণ্য যোগ করুন, পরিমাণ ঠিক করুন, আপনার বিভাগ বাছুন — তারপর AI কম খরচের বাজার প্ল্যান দেখাবে।
                </p>
            </section>

            <div className="basket-layout">
                <section>
                    <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
                        <div className="basket-filter-grid">
                            <label style={{ display: "grid", gap: 6 }}>
                                <span className="filter-label">পণ্য খুঁজুন</span>

                                <input
                                    className="mm-input"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="যেমন: পেঁয়াজ, চাল, মাছ..."
                                />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <span className="filter-label">আপনার এলাকা</span>

                                <select
                                    className="mm-select"
                                    value={divisionId}
                                    onChange={(e) => handleDivisionChange(e.target.value)}
                                >
                                    <option value="all">সব বিভাগ</option>

                                    {DIVISIONS.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="category-strip" style={{ marginTop: 14 }}>
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
                    </div>

                    <div className="section-head" style={{ marginTop: 0 }}>
                        <div>
                            <h2 className="section-title">পণ্য যোগ করুন</h2>

                            <p className="section-note">
                                দেখানো হচ্ছে {bnNum(visibleProducts.length)}টি পণ্য — {divisionId === "all" ? "সব বিভাগ" : `${selectedDivision?.name} বিভাগ`}.
                            </p>
                        </div>
                    </div>

                    {visibleProducts.length === 0 ? (
                        <div className="empty-state">
                            এই সিলেকশনে কোনো পণ্য পাওয়া যায়নি।
                        </div>
                    ) : (
                        <div className="basket-product-grid">
                            {visibleProducts.map((key) => {
                                const p = prices[key];
                                const inBasket = basket[key] > 0;

                                return (
                                    <button
                                        key={key}
                                        className={`mini-product-btn ${inBasket ? "active" : ""}`}
                                        onClick={() =>
                                            updateQty(key, (basket[key] || 0) + step(p.unit))
                                        }
                                    >
                                        <div className="mini-product-img">
                                            <img
                                                src={getProductImage(key)}
                                                alt={formatProductName(key)}
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.currentTarget.src =
                                                        "/products/360_F_177224431_6S50Gr64wFWjkDHBGXq7PkaG5kcrgEgd.jpg";
                                                }}
                                            />
                                        </div>

                                        <div className="mini-product-content">
                                            <div className="mini-product-name">
                                                {formatProductName(key)}
                                            </div>

                                            <div className="mini-product-price">
                                                {bnTk(p.avg, 2)} / {formatUnit(p.unit)}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                <aside className="basket-sidebar">
                    <div className="glass-card basket-panel">
                        <div className="basket-header">
                            <div>
                                <h2 className="section-title" style={{ fontSize: 20 }}>
                                    আপনার বাজার লিস্ট
                                </h2>

                                <p className="section-note">আপনার ব্রাউজারে সেভ থাকবে</p>
                            </div>

                            {items.length > 0 && (
                                <button className="mm-btn danger" onClick={clearBasket}>
                                    মুছুন
                                </button>
                            )}
                        </div>

                        {hiddenBasketCount > 0 && divisionId !== "all" && (
                            <div className="basket-warning">
                                {bnNum(hiddenBasketCount)}টি সেভ করা পণ্য লুকানো আছে, কারণ এগুলো {selectedDivision?.name} বিভাগে পাওয়া যাচ্ছে না।
                            </div>
                        )}

                        {items.length === 0 ? (
                            <div className="empty-state basket-empty">
                                {hiddenBasketCount > 0
                                    ? "এই বিভাগে আপনার লিস্টের পণ্য পাওয়া যাচ্ছে না।"
                                    : "আপনার বাজার লিস্ট খালি। পণ্য চাপ দিয়ে যোগ করুন।"}
                            </div>
                        ) : (
                            <>
                                <div className="basket-items-list">
                                    {items.map((item) => (
                                        <div key={item.key} className="basket-row">
                                            <div className="basket-row-img">
                                                <img
                                                    src={getProductImage(item.key)}
                                                    alt={formatProductName(item.key)}
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.currentTarget.src =
                                                            "/products/360_F_177224431_6S50Gr64wFWjkDHBGXq7PkaG5kcrgEgd.jpg";
                                                    }}
                                                />
                                            </div>

                                            <div className="basket-item-info">
                                                <div className="basket-item-name">
                                                    {formatProductName(item.key)}
                                                </div>

                                                <div className="basket-item-unit">
                                                    {bnTk(item.unitPrice, 2)} / {formatUnit(item.unit)}
                                                </div>
                                            </div>

                                            <div className="qty-control">
                                                <button
                                                    className="qty-btn"
                                                    onClick={() =>
                                                        updateQty(
                                                            item.key,
                                                            +(item.qty - step(item.unit)).toFixed(2)
                                                        )
                                                    }
                                                >
                                                    −
                                                </button>

                                                <span className="qty-text">
                                                    {bnNum(item.qty)} {formatUnit(item.unit)}
                                                </span>

                                                <button
                                                    className="qty-btn"
                                                    onClick={() =>
                                                        updateQty(
                                                            item.key,
                                                            +(item.qty + step(item.unit)).toFixed(2)
                                                        )
                                                    }
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <div className="basket-line-total">
                                                {bnTk(item.lineTotal, 2)}
                                            </div>

                                            <button
                                                className="basket-remove-btn"
                                                onClick={() => updateQty(item.key, 0)}
                                                aria-label="মুছুন"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="basket-total-card">
                                    <span>
                                        মোট ({bnNum(items.length)}টি পণ্য)
                                    </span>

                                    <strong>{bnTk(total, 2)}</strong>
                                </div>
                            </>
                        )}

                        <button
                            type="button"
                            className="mm-btn basket-optimize-btn"
                            onClick={runOptimizer}
                            disabled={planLoading || items.length === 0}
                        >
                            {planLoading
                                ? "হিসাব হচ্ছে…"
                                : items.length === 0
                                    ? "আগে পণ্য যোগ করুন"
                                    : "🧮 কম খরচে কীভাবে কিনবেন"}
                        </button>

                        {planError && <p className="basket-plan-error">{planError}</p>}

                        {plan && (
                            <div ref={resultRef} className="basket-plan-result">
                                <div className="basket-result-heading">
                                    <div>
                                        <h3>সবচেয়ে কম খরচের প্ল্যান</h3>
                                        <p>ফলাফল এখানে দেখানো হয়েছে, তাই আবার সব পণ্যের নিচে যেতে হবে না।</p>
                                    </div>
                                </div>

                                <SectionCard title="ছোট সারাংশ" compact>
                                    <BasketPlanSummary plan={plan} />
                                </SectionCard>

                                <SectionCard title="স্মার্ট তথ্য" compact>
                                    <BasketInsights items={plan.items} />
                                </SectionCard>

                                {plan.ai_summary && (
                                    <SectionCard title="AI ব্যাখ্যা" compact>
                                        <AiSummary text={translateApiText(plan.ai_summary)} />
                                    </SectionCard>
                                )}

                                <SectionCard title="কেনার প্ল্যান" compact>
                                    <ShoppingPlanList items={plan.items} />
                                </SectionCard>

                                {plan.market_ranking?.length > 0 && (
                                    <SectionCard
                                        title={
                                            divisionId === "all"
                                                ? "সেরা বাজার পরামর্শ"
                                                : `${selectedDivision?.name} বিভাগের সেরা বাজার`
                                        }
                                        compact
                                    >
                                        <MarketRankingCards ranking={plan.market_ranking} />
                                    </SectionCard>
                                )}

                                {plan.unresolved_products?.length > 0 && (
                                    <div className="basket-unresolved">
                                        এই পণ্যের বাজার ডাটা নেই{divisionId !== "all" ? " এই বিভাগে" : ""}:
                                        {plan.unresolved_products.map(formatProductName).join(", ")}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}

function SectionCard({ title, children, compact = false }) {
    return (
        <div className={`glass-card section-card ${compact ? "compact-section-card" : ""}`}>
            <div className="section-card-title">{title}</div>
            {children}
        </div>
    );
}

function AiSummary({ text }) {
    const sentences = text
        .split(/(?<=[।.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

    if (sentences.length <= 1) {
        return <p className="ai-summary-text">{text}</p>;
    }

    return (
        <ul className="ai-summary-list">
            {sentences.map((s, i) => (
                <li key={i}>{s}</li>
            ))}
        </ul>
    );
}