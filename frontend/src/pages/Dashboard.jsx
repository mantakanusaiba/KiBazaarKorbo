import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPricesToday } from "../api/client";
import PriceCard from "../components/PriceCard";

const fmt = (key = "") =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function StatBubble({ label, value, color }) {
    return (
        <div style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            boxShadow: "var(--shadow-xs)",
            border: "1px solid var(--gray-200)",
            flex: 1,
            minWidth: 140,
        }}>
            <div style={{ fontSize: 11, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                {label}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: color || "var(--gray-900)" }}>
                {value}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        getPricesToday()
            .then((r) => setPrices(r.data))
            .catch((e) => setError("Could not load prices. Is the backend running?"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="page-enter">
                <div style={{ marginBottom: 24 }}>
                    <div className="skeleton" style={{ height: 28, width: 240, marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 16, width: 320 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 110, borderRadius: "var(--radius-md)" }} />
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

    // Aggregate: average per product across markets
    const byProduct = {};
    prices.forEach((p) => {
        const key = p.standard_key;
        if (!byProduct[key]) {
            byProduct[key] = { ...p, product: p.product_en || fmt(key), count: 1 };
        } else {
            byProduct[key].avg_price += p.avg_price;
            byProduct[key].min_price = Math.min(byProduct[key].min_price, p.min_price);
            byProduct[key].max_price = Math.max(byProduct[key].max_price, p.max_price);
            byProduct[key].count++;
        }
    });
    Object.values(byProduct).forEach((v) => {
        v.avg_price = +(v.avg_price / v.count).toFixed(2);
    });
    const items = Object.values(byProduct);

    const latestDate = prices[0]?.date?.slice(0, 10) || "Today";
    const markets = [...new Set(prices.map((p) => p.market))];

    return (
        <div className="page-enter">
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 700,
                    color: "var(--gray-900)",
                    marginBottom: 6,
                    letterSpacing: "-0.3px",
                }}>
                    Today's Market Prices
                </h1>
                <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
                    Official retail prices from Dhaka markets · {latestDate}
                </p>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
                <StatBubble label="Products tracked" value={items.length} color="var(--brand-600)" />
                <StatBubble label="Markets covered" value={markets.length} color="var(--green-600)" />
                <StatBubble label="Data source" value="DAM / TCB" />
            </div>

            {/* Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))",
                gap: 14,
            }}>
                {items.map((p) => (
                    <PriceCard
                        key={p.standard_key}
                        product={p.product}
                        min={p.min_price}
                        max={p.max_price}
                        avg={p.avg_price}
                        unit={p.unit || "kg"}
                        onClick={() => navigate(`/search?product=${p.standard_key}`)}
                    />
                ))}
            </div>

            {/* Footer hint */}
            <p style={{ marginTop: 20, fontSize: 12, color: "var(--gray-400)", textAlign: "right" }}>
                Click any card to view detailed history →
            </p>
        </div>
    );
}