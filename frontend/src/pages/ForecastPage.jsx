import { useEffect, useState } from "react";
import { getProducts, getExplanation, getPriceHistory } from "../api/client";
import AdviceBadge from "../components/AdviceBadge";
import ExplanationBox from "../components/ExplanationBox";
import TrendChart from "../components/TrendChart";
import ProductSelector, { toLabel } from "../components/ProductSelector";

export default function ForecastPage() {
    const [products, setProducts] = useState([]);
    const [selected, setSelected] = useState("");
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        getProducts().then(r => {
            setProducts(r.data);
            if (r.data.length) setSelected(r.data[0]);
        });
    }, []);

    const run = async () => {
        if (!selected) return;
        setLoading(true);
        setResult(null);
        setError(null);
        setHistory([]);
        try {
            const [explRes, histRes] = await Promise.all([
                getExplanation(selected),
                getPriceHistory(selected, 30),
            ]);
            if (explRes.data.error) throw new Error(explRes.data.error);
            setResult(explRes.data);
            setHistory(histRes.data);
        } catch (e) {
            setError(e.message || "Forecast failed.");
        } finally {
            setLoading(false);
        }
    };

    const dir = result?.direction;

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ marginBottom: 6 }}>Tomorrow's Forecast</h1>
                <p style={{ color: "var(--muted)", fontSize: 13 }}>
                    XGBoost prediction + AI explanation · Pick a product and run
                </p>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
                <ProductSelector
                    products={products}
                    value={selected}
                    onChange={setSelected}
                />
                <button
                    onClick={run}
                    disabled={loading || !selected}
                    style={{
                        background: loading ? "var(--surface2)" : "var(--accent)",
                        color: loading ? "var(--muted)" : "#fff",
                        border: "none",
                        borderRadius: "var(--radius)",
                        padding: "8px 20px",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontSize: 13,
                        transition: "background 0.15s",
                    }}
                >
                    {loading ? "Running model…" : "Run Forecast"}
                </button>
            </div>

            {error && (
                <div style={{
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.25)",
                    borderRadius: "var(--radius)",
                    padding: "12px 16px",
                    color: "var(--up)",
                    fontSize: 13,
                    marginBottom: 20,
                }}>
                    ⚠ {error}
                </div>
            )}

            {result && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                    {/* Numbers */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                        gap: 12,
                    }}>
                        <NumBox label="Today avg" value={`৳${result.current_avg}`} />
                        <NumBox
                            label="Tomorrow (predicted)"
                            value={`৳${result.predicted_tomorrow}`}
                            accent={dir === "increase" ? "var(--up)" : dir === "decrease" ? "var(--down)" : null}
                        />
                        <NumBox
                            label="Expected change"
                            value={`${result.change_pct > 0 ? "+" : ""}${result.change_pct}%`}
                            accent={result.change_pct > 0 ? "var(--up)" : result.change_pct < 0 ? "var(--down)" : "var(--stable)"}
                        />
                    </div>

                    {/* Advice */}
                    <div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Shopping advice
                        </div>
                        <AdviceBadge advice={result.advice} reason={result.reason} size="lg" />
                    </div>

                    {/* AI explanation */}
                    <ExplanationBox text={result.explanation} />

                    {/* Chart */}
                    {history.length > 0 && (
                        <div style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-lg)",
                            padding: "18px 20px",
                        }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>
                                {toLabel(selected)} — Last 30 days
                            </div>
                            <TrendChart data={history} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function NumBox({ label, value, accent }) {
    return (
        <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "14px 16px",
        }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 22,
                fontWeight: 600,
                color: accent || "var(--text)",
            }}>{value}</div>
        </div>
    );
}