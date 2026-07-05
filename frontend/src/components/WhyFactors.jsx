import { translateApiText } from "../utils/productAssets";

function featureIcon(feature = "") {
    if (feature.startsWith("avg_") || feature.startsWith("price_change")) return "📈";
    if (feature.startsWith("rainfall") || feature.startsWith("temp_")) return "🌡";
    if (feature === "market_code") return "🛒";
    if (["day_of_week", "month", "is_weekend", "is_festival", "days_to_festival"].includes(feature)) {
        return "📅";
    }
    return "🔎";
}

export default function WhyFactors({ factors, detailed = false }) {
    if (!factors || factors.length === 0) return null;

    return (
        <div>
            {!detailed && (
                <div style={{
                    fontSize: 11,
                    color: "var(--gray-500)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                }}>
                    দামে প্রভাব ফেলা কারণ
                </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {factors.map(f => {
                    const isUp = f.direction === "up";
                    const label = translateApiText(f.label_bn || f.label_en || f.feature);
                    return (
                        <div
                            key={f.feature}
                            title={label}
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
                            <span aria-hidden="true">{featureIcon(f.feature)}</span>
                            <span style={{ fontWeight: 700 }}>{isUp ? "↑" : "↓"}</span>
                            {label}
                            {detailed && f.shap_value != null && (
                                <span style={{ opacity: 0.65, fontSize: 11 }}>
                                    ({f.shap_value > 0 ? "+" : ""}{f.shap_value})
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
