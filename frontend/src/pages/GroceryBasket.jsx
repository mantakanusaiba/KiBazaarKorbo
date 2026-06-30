import { useEffect, useState } from "react";
import { getProducts, getPricesToday } from "../api/client";

const STORAGE_KEY = "mm_basket";

const fmt = (key = "") =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const UNIT_STEP = {
    kg: 0.5,
    liter: 0.5,
    dozen: 1,
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
        // localStorage unavailable (private mode etc) — fail silently
    }
}

export default function GroceryBasket() {
    const [products, setProducts] = useState([]);
    const [prices, setPrices] = useState({});   // standard_key -> { avg, unit, product_en }
    const [basket, setBasket] = useState({});   // standard_key -> qty
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setBasket(loadBasket());

        Promise.all([getProducts(), getPricesToday()])
            .then(([prodRes, priceRes]) => {
                setProducts(prodRes.data);

                // Aggregate avg price per product across all markets
                const byProduct = {};
                priceRes.data.forEach((p) => {
                    const key = p.standard_key;
                    if (!byProduct[key]) {
                        byProduct[key] = {
                            total: p.avg_price,
                            count: 1,
                            unit: p.unit || "kg",
                            product_en: p.product_en || fmt(key),
                        };
                    } else {
                        byProduct[key].total += p.avg_price;
                        byProduct[key].count++;
                    }
                });

                const priceMap = {};
                Object.entries(byProduct).forEach(([key, v]) => {
                    priceMap[key] = {
                        avg: +(v.total / v.count).toFixed(2),
                        unit: v.unit,
                        product_en: v.product_en,
                    };
                });
                setPrices(priceMap);
            })
            .catch(() => setError("Could not load prices. Is the backend running?"))
            .finally(() => setLoading(false));
    }, []);

    const updateQty = (key, qty) => {
        const next = { ...basket };
        if (qty <= 0) {
            delete next[key];
        } else {
            next[key] = qty;
        }
        setBasket(next);
        saveBasket(next);
    };

    const step = (unit) => UNIT_STEP[unit] || UNIT_STEP.default;

    const clearBasket = () => {
        setBasket({});
        saveBasket({});
    };

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

    const total = items.reduce((sum, i) => sum + i.lineTotal, 0);

    if (loading) {
        return (
            <div className="page-enter">
                <div className="skeleton" style={{ height: 28, width: 220, marginBottom: 24 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 60, borderRadius: "var(--radius-md)" }} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                background: "var(--red-50)", border: "1px solid #fecaca",
                borderRadius: "var(--radius-md)", padding: 24, color: "var(--red-600)",
                fontSize: 14, maxWidth: 480,
            }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Connection Error</div>
                {error}
            </div>
        );
    }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h1 style={{
                        fontFamily: "var(--font-display)", fontSize: 26,
                        fontWeight: 700, marginBottom: 6, letterSpacing: "-0.3px",
                    }}>
                        Grocery Basket
                    </h1>
                    <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
                        Saved in your browser — no account needed.
                    </p>
                </div>
                {items.length > 0 && (
                    <button
                        onClick={clearBasket}
                        style={{
                            background: "var(--surface)",
                            border: "1px solid var(--gray-300)",
                            borderRadius: "var(--radius-sm)",
                            padding: "8px 16px",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--gray-600)",
                            cursor: "pointer",
                        }}
                    >
                        🗑 Clear Basket
                    </button>
                )}
            </div>

            {/* Add items */}
            <div style={{
                background: "var(--surface)",
                border: "1px solid var(--gray-200)",
                borderRadius: "var(--radius-lg)",
                padding: "20px 24px",
                marginBottom: 28,
                boxShadow: "var(--shadow-xs)",
            }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--gray-700)", marginBottom: 14 }}>
                    Add products
                </div>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: 10,
                }}>
                    {products.map((key) => {
                        const p = prices[key];
                        const inBasket = basket[key] > 0;
                        return (
                            <button
                                key={key}
                                onClick={() => updateQty(key, (basket[key] || 0) + step(p?.unit))}
                                style={{
                                    background: inBasket ? "var(--brand-50)" : "var(--gray-50)",
                                    border: `1px solid ${inBasket ? "var(--brand-100)" : "var(--gray-200)"}`,
                                    borderRadius: "var(--radius-sm)",
                                    padding: "10px 12px",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-900)" }}>
                                    {p?.product_en || fmt(key)}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>
                                    {p ? `৳${p.avg} / ${p.unit}` : "—"}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Basket items */}
            {items.length === 0 ? (
                <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
                    Your basket is empty. Tap a product above to add it.
                </p>
            ) : (
                <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                        {items.map((item) => (
                            <div
                                key={item.key}
                                style={{
                                    background: "var(--surface)",
                                    border: "1px solid var(--gray-200)",
                                    borderRadius: "var(--radius-md)",
                                    padding: "14px 18px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    boxShadow: "var(--shadow-xs)",
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--gray-900)" }}>
                                        {item.product_en}
                                    </div>
                                    <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>
                                        ৳{item.unitPrice} / {item.unit}
                                    </div>
                                </div>

                                {/* Qty controls */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <button
                                        onClick={() => updateQty(item.key, +(item.qty - step(item.unit)).toFixed(2))}
                                        style={{
                                            width: 28, height: 28, borderRadius: "50%",
                                            border: "1px solid var(--gray-300)", background: "var(--surface)",
                                            cursor: "pointer", fontSize: 16, lineHeight: 1,
                                        }}
                                    >
                                        −
                                    </button>
                                    <span style={{ fontSize: 14, fontWeight: 600, minWidth: 48, textAlign: "center" }}>
                                        {item.qty} {item.unit}
                                    </span>
                                    <button
                                        onClick={() => updateQty(item.key, +(item.qty + step(item.unit)).toFixed(2))}
                                        style={{
                                            width: 28, height: 28, borderRadius: "50%",
                                            border: "1px solid var(--gray-300)", background: "var(--surface)",
                                            cursor: "pointer", fontSize: 16, lineHeight: 1,
                                        }}
                                    >
                                        +
                                    </button>
                                </div>

                                <div style={{
                                    fontFamily: "var(--font-display)", fontWeight: 700,
                                    fontSize: 16, color: "var(--brand-600)", minWidth: 70, textAlign: "right",
                                }}>
                                    ৳{item.lineTotal.toFixed(2)}
                                </div>

                                <button
                                    onClick={() => updateQty(item.key, 0)}
                                    aria-label="Remove"
                                    style={{
                                        background: "none", border: "none", cursor: "pointer",
                                        color: "var(--gray-400)", fontSize: 16, padding: 4,
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div style={{
                        background: "var(--brand-50)",
                        border: "1px solid var(--brand-100)",
                        borderRadius: "var(--radius-lg)",
                        padding: "18px 24px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        maxWidth: 400,
                    }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--gray-700)" }}>
                            Total ({items.length} item{items.length > 1 ? "s" : ""})
                        </span>
                        <span style={{
                            fontFamily: "var(--font-display)", fontSize: 24,
                            fontWeight: 700, color: "var(--brand-700)",
                        }}>
                            ৳{total.toFixed(2)}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}