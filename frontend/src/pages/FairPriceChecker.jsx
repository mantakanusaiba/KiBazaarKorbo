import { useState } from "react";
import { postFairPrice } from "../api/client";
import ProductSelector from "../components/ProductSelector";

export default function FairPriceChecker() {
    const [product, setProduct] = useState("");
    const [paid, setPaid] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const check = async () => {
        if (!product || !paid) return;
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const res = await postFairPrice(product, parseFloat(paid));
            setResult(res.data);
        } catch (e) {
            setError("Could not check price. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    const colorMap = { green: "var(--green-600)", red: "var(--red-600)", gray: "var(--gray-500)" };
    const bgMap = { green: "var(--green-50)", red: "var(--red-50)", gray: "var(--gray-50)" };
    const borderMap = { green: "var(--green-100)", red: "#fecaca", gray: "var(--gray-200)" };

    return (
        <div className="page-enter">
            <div style={{ marginBottom: 28 }}>
                <h1 style={{
                    fontFamily: "var(--font-display)", fontSize: 26,
                    fontWeight: 700, marginBottom: 6, letterSpacing: "-0.3px"
                }}>
                    Fair Price Checker
                </h1>
                <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
                    Enter what you paid and compare with the official Dhaka market range.
                </p>
            </div>

            <div style={{
                background: "var(--surface)",
                border: "1px solid var(--gray-200)",
                borderRadius: "var(--radius-lg)",
                padding: "24px 28px",
                maxWidth: 440,
                boxShadow: "var(--shadow-xs)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
            }}>
                <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: 6 }}>
                        Product
                    </label>
                    <ProductSelector value={product} onChange={setProduct} />
                </div>

                <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: 6 }}>
                        Price you paid (BDT)
                    </label>
                    <input
                        type="number"
                        placeholder="e.g. 195"
                        value={paid}
                        onChange={e => setPaid(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "9px 14px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--gray-300)",
                            fontSize: 14,
                            background: "var(--surface)",
                            color: "var(--gray-900)",
                        }}
                    />
                </div>

                <button
                    onClick={check}
                    disabled={loading || !product || !paid}
                    style={{
                        background: loading ? "var(--gray-100)" : "var(--brand-600)",
                        color: loading ? "var(--gray-500)" : "#fff",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        padding: "10px 20px",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "background 0.15s",
                    }}
                >
                    {loading ? "Checking…" : "⚖️ Check Price"}
                </button>
            </div>

            {error && (
                <div style={{
                    marginTop: 20, background: "var(--red-50)",
                    border: "1px solid #fecaca", borderRadius: "var(--radius-md)",
                    padding: "12px 16px", color: "var(--red-600)", fontSize: 13, maxWidth: 440,
                }}>
                    ⚠️ {error}
                </div>
            )}

            {result && (
                <div style={{
                    marginTop: 24,
                    background: bgMap[result.color] || "var(--gray-50)",
                    border: `2px solid ${borderMap[result.color] || "var(--gray-200)"}`,
                    borderRadius: "var(--radius-lg)",
                    padding: "20px 24px",
                    maxWidth: 440,
                }}>
                    <div style={{
                        color: colorMap[result.color] || "var(--gray-700)",
                        fontWeight: 700, fontSize: 17, marginBottom: 8,
                    }}>
                        {result.color === "green" ? "✅" : result.color === "red" ? "❌" : "➖"} {result.label}
                    </div>
                    <p style={{ fontSize: 14, color: "var(--gray-700)", lineHeight: 1.6, marginBottom: 12 }}>
                        {result.message}
                    </p>
                    <div style={{
                        display: "flex", gap: 16, fontSize: 13,
                        color: "var(--gray-500)", borderTop: "1px solid var(--gray-200)", paddingTop: 12,
                    }}>
                        <span>You paid: <strong style={{ color: "var(--gray-900)" }}>৳{result.paid}</strong></span>
                        <span>Official range: <strong style={{ color: "var(--gray-900)" }}>৳{result.official_min} – ৳{result.official_max}</strong></span>
                    </div>
                </div>
            )}
        </div>
    );
}