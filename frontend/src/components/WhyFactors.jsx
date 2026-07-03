/**
 * Shows the actual features that drove a specific prediction, ranked by
 * SHAP value (see backend/ml/explain_utils.py). This is the model's real
 * reasoning, not a marketing summary — each chip is one feature that
 * measurably pushed the forecast up or down.
 */
export default function WhyFactors({ factors }) {
    if (!factors || factors.length === 0) return null;

    return (
        <div>
            <div style={{
                fontSize: 11,
                color: "var(--gray-500)",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
            }}>
                Why this prediction (model drivers)
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {factors.map(f => {
                    const isUp = f.direction === "up";
                    return (
                        <div
                            key={f.feature}
                            title={f.label_bn}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: isUp ? "var(--red-50)" : "var(--green-50)",
                                border: `1px solid ${isUp ? "#fecaca" : "var(--green-100)"}`,
                                color: isUp ? "var(--red-600)" : "var(--green-700)",
                                borderRadius: 999,
                                padding: "5px 12px",
                                fontSize: 12.5,
                                fontWeight: 500,
                            }}
                        >
                            <span style={{ fontWeight: 700 }}>{isUp ? "↑" : "↓"}</span>
                            {f.label_en}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}