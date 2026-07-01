import { useEffect, useState, useCallback } from "react";
import {
    getProducts,
    watchProduct,
    unwatchProduct,
    getWatches,
    checkAlerts,
} from "../api/client";

const CLIENT_ID_KEY = "mm_client_id";
const POLL_MS = 60_000; // re-check every minute while the tab is open

const fmt = (key = "") =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function getClientId() {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
        id = "u_" + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
}

export default function PriceAlerts() {
    const [clientId] = useState(getClientId);
    const [products, setProducts] = useState([]);
    const [selected, setSelected] = useState("");
    const [threshold, setThreshold] = useState(-5);
    const [watches, setWatches] = useState({});
    const [triggered, setTriggered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(() => {
        Promise.all([getWatches(clientId), checkAlerts(clientId)])
            .then(([w, t]) => {
                setWatches(w.data);
                setTriggered(t.data);
            })
            .catch(() => setError("Could not reach the alerts service."));
    }, [clientId]);

    useEffect(() => {
        getProducts()
            .then((res) => {
                setProducts(res.data);
                setSelected(res.data[0] || "");
            })
            .catch(() => setError("Could not load products. Is the backend running?"))
            .finally(() => setLoading(false));
        refresh();

        // Ask for browser notification permission once, best-effort.
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        const interval = setInterval(refresh, POLL_MS);
        return () => clearInterval(interval);
    }, [refresh]);

    // Fire a native browser notification whenever a newly-triggered alert appears.
    useEffect(() => {
        if (triggered.length > 0 && "Notification" in window && Notification.permission === "granted") {
            triggered.forEach((t) => {
                new Notification(`Price drop: ${fmt(t.product)}`, { body: t.message });
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggered.length]);

    const addWatch = () => {
        if (!selected) return;
        watchProduct(clientId, selected, Number(threshold))
            .then(refresh)
            .catch(() => setError("Could not add watch."));
    };

    const removeWatch = (product) => {
        unwatchProduct(clientId, product)
            .then(refresh)
            .catch(() => setError("Could not remove watch."));
    };

    if (loading) {
        return (
            <div className="page-enter">
                <div className="skeleton" style={{ height: 28, width: 220, marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 80, borderRadius: "var(--radius-md)" }} />
            </div>
        );
    }

    return (
        <div className="page-enter">
            <div style={{ marginBottom: 24 }}>
                <h1 style={{
                    fontFamily: "var(--font-display)", fontSize: 26,
                    fontWeight: 700, marginBottom: 6, letterSpacing: "-0.3px",
                }}>
                    Price Alerts
                </h1>
                <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
                    Watch a product and get notified when our model predicts a meaningful price drop.
                </p>
            </div>

            {error && (
                <div style={{
                    background: "var(--red-50)", border: "1px solid #fecaca",
                    borderRadius: "var(--radius-md)", padding: 16, color: "var(--red-600)",
                    fontSize: 13, marginBottom: 20,
                }}>
                    {error}
                </div>
            )}

            {/* Triggered alerts */}
            {triggered.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                    {triggered.map((t) => (
                        <div key={t.product} style={{
                            background: "#f0fdf4", border: "1px solid #bbf7d0",
                            borderRadius: "var(--radius-md)", padding: "14px 18px",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "#166534" }}>
                                    🔔 {fmt(t.product)} — {t.change_pct}% predicted tomorrow
                                </div>
                                <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>
                                    ৳{t.current_avg} → ৳{t.predicted_tomorrow}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add a watch */}
            <div style={{
                background: "var(--surface)",
                border: "1px solid var(--gray-200)",
                borderRadius: "var(--radius-lg)",
                padding: "20px 24px",
                marginBottom: 28,
                boxShadow: "var(--shadow-xs)",
            }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--gray-700)", marginBottom: 14 }}>
                    Watch a product
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                        style={{
                            padding: "9px 12px", borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--gray-300)", fontSize: 13, minWidth: 200,
                        }}
                    >
                        {products.map((p) => (
                            <option key={p} value={p}>{fmt(p)}</option>
                        ))}
                    </select>

                    <label style={{ fontSize: 13, color: "var(--gray-600)", display: "flex", alignItems: "center", gap: 6 }}>
                        Alert me when drop ≥
                        <input
                            type="number"
                            value={Math.abs(threshold)}
                            min={1}
                            max={50}
                            onChange={(e) => setThreshold(-Math.abs(Number(e.target.value)))}
                            style={{
                                width: 60, padding: "8px 10px", borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--gray-300)", fontSize: 13,
                            }}
                        />
                        %
                    </label>

                    <button
                        onClick={addWatch}
                        style={{
                            background: "var(--brand-600, #1a56db)", color: "#fff", border: "none",
                            borderRadius: "var(--radius-sm)", padding: "9px 18px", fontSize: 13,
                            fontWeight: 700, cursor: "pointer",
                        }}
                    >
                        + Add Watch
                    </button>
                </div>
            </div>

            {/* Current watchlist */}
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--gray-700)", marginBottom: 12 }}>
                Your watchlist
            </div>
            {Object.keys(watches).length === 0 ? (
                <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
                    Nothing watched yet — add a product above.
                </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {Object.entries(watches).map(([product, th]) => (
                        <div key={product} style={{
                            background: "var(--surface)", border: "1px solid var(--gray-200)",
                            borderRadius: "var(--radius-md)", padding: "12px 18px",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(product)}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <span style={{ fontSize: 12, color: "var(--gray-500)" }}>
                                    alert at {th}% or worse
                                </span>
                                <button
                                    onClick={() => removeWatch(product)}
                                    aria-label="Remove watch"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: 16 }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}