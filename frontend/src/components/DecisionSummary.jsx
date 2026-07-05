import { AdviceCard } from "./AdviceBadge";
import { computeConfidence, computeRisk, computeSavings, computeTrend } from "../utils/forecastMath";
import { translateApiText } from "../utils/productAssets";
import { bnNum, bnPct, bnTk } from "../utils/banglaFormat";

const RISK_STYLES = {
    low: { text: "var(--green-700)", bg: "var(--green-50)", border: "var(--green-100)" },
    medium: { text: "var(--amber-600)", bg: "var(--amber-50)", border: "#fde68a" },
    high: { text: "var(--red-600)", bg: "var(--red-50)", border: "#fecaca" },
};

export default function DecisionSummary({ productLabel, marketName, result, week }) {
    const currentAvg = result.current_avg;
    const predictedTomorrow = result.predicted_tomorrow;
    const predictedLow = result.predicted_low;
    const predictedHigh = result.predicted_high;

    const trend = computeTrend(week);
    const confidence = computeConfidence(predictedLow, predictedHigh, predictedTomorrow);
    const risk = confidence ? computeRisk(confidence.bandPct) : null;
    const savings = computeSavings({ currentAvg, predictedTomorrow, week });

    const trendText = !trend
        ? "পুরো ফোরকাস্ট লোড হচ্ছে…"
        : trend.direction === "rising"
            ? `সামনের আপডেটগুলোতে দাম বাড়ার সম্ভাবনা আছে — শেষ ধাপে প্রায় ${bnPct(trend.pct, 1)} বেশি হতে পারে।`
            : trend.direction === "falling"
                ? `সামনের আপডেটগুলোতে দাম কমার সম্ভাবনা আছে — শেষ ধাপে প্রায় ${bnPct(Math.abs(trend.pct), 1)} কম হতে পারে।`
                : "সামনের আপডেটগুলোতে দাম প্রায় একই থাকতে পারে — সর্বশেষ দামের তুলনায় ২% এর কম ওঠানামা।";

    const priceAccent = result.direction === "increase"
        ? "var(--red-600)"
        : result.direction === "decrease"
            ? "var(--green-600)"
            : "var(--gray-900)";

    return (
        <div style={{
            background: "var(--surface)",
            border: "1px solid var(--gray-200)",
            borderRadius: "var(--radius-lg)",
            padding: "24px 26px",
            boxShadow: "var(--shadow-sm)",
            position: "relative",
            overflow: "hidden",
        }}>
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 4,
                background: "linear-gradient(90deg, var(--brand-600), var(--brand-500))",
            }} />

            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                flexWrap: "wrap", gap: 14, marginBottom: 20,
            }}>
                <div>
                    <div style={{
                        fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
                        color: "var(--gray-900)", letterSpacing: "-0.3px",
                    }}>
                        {productLabel}
                    </div>
                    <div style={{
                        fontSize: 12, color: "var(--gray-500)", marginTop: 3,
                        textTransform: "uppercase", letterSpacing: "0.5px",
                    }}>
                        {marketName}
                    </div>
                </div>
                <AdviceCard advice={result.advice} reason={translateApiText(result.reason)} />
            </div>

            <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 14, marginBottom: 16,
            }}>
                <PriceStat label="সর্বশেষ বাজার দাম" value={currentAvg} />
                <PriceStat
                    label="পরের আপডেটে ধারণা করা দাম"
                    value={predictedTomorrow}
                    sub={predictedLow != null ? `সম্ভাব্য ${bnTk(predictedLow, 2)} – ${bnTk(predictedHigh, 2)}` : null}
                    accent={priceAccent}
                />
            </div>

            <p style={{ fontSize: 13.5, color: "var(--gray-700)", lineHeight: 1.6, marginBottom: 18 }}>
                {trendText}
            </p>

            <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12,
            }}>
                <MetricBox
                    label="মডেলের ভরসা"
                    tooltip="দামের সম্ভাব্য সীমা যত ছোট, মডেলের ভরসা তত বেশি। এটি ১০০% গ্যারান্টি নয়।"
                >
                    {confidence ? (
                        <>
                            <div style={{ fontSize: 17, letterSpacing: 2, color: "var(--brand-600)" }}>
                                {"★".repeat(confidence.stars)}{"☆".repeat(5 - confidence.stars)}
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--gray-500)", marginTop: 2 }}>
                                {bnNum(confidence.confidencePct)}%
                            </div>
                        </>
                    ) : (
                        <EmptyMetric text="ডাটা যথেষ্ট নেই" />
                    )}
                </MetricBox>

                <MetricBox label="ঝুঁকির মাত্রা">
                    {risk ? (
                        <span style={{
                            display: "inline-block", padding: "3px 10px", borderRadius: 999,
                            fontSize: 12.5, fontWeight: 600,
                            color: RISK_STYLES[risk.level].text,
                            background: RISK_STYLES[risk.level].bg,
                            border: `1px solid ${RISK_STYLES[risk.level].border}`,
                        }}>
                            {risk.label}
                        </span>
                    ) : (
                        <EmptyMetric text="ডাটা যথেষ্ট নেই" />
                    )}
                </MetricBox>

                <MetricBox label="এখন কিনলে বনাম পরের আপডেট">
                    {savings.buyTodaySaving != null ? (
                        savings.buyTodaySaving > 0 ? (
                            <SavingValue amount={savings.buyTodaySaving} />
                        ) : (
                            <EmptyMetric text="এখন কিনলে আলাদা সাশ্রয় নেই" />
                        )
                    ) : (
                        <EmptyMetric text="এই পণ্যের সাশ্রয় হিসাব করার মতো ডাটা নেই" />
                    )}
                </MetricBox>

                <MetricBox label="২ ধাপ অপেক্ষা করলে বনাম এখন">
                    {savings.hasDay2 ? (
                        savings.waitSaving > 0 ? (
                            <SavingValue amount={savings.waitSaving} />
                        ) : (
                            <EmptyMetric text="অপেক্ষা করলে আলাদা সাশ্রয় নেই" />
                        )
                    ) : (
                        <EmptyMetric text="এই পণ্যের সাশ্রয় হিসাব করার মতো ডাটা নেই" />
                    )}
                </MetricBox>
            </div>
        </div>
    );
}

function PriceStat({ label, value, sub, accent }) {
    return (
        <div>
            <div style={{
                fontSize: 11, color: "var(--gray-500)", textTransform: "uppercase",
                letterSpacing: "0.5px", marginBottom: 4,
            }}>
                {label}
            </div>
            <div style={{
                fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700,
                color: accent || "var(--gray-900)", letterSpacing: "-0.5px",
            }}>
                {bnTk(value, 2)}
            </div>
            {sub && <div style={{ fontSize: 11.5, color: "var(--gray-500)", marginTop: 3 }}>{sub}</div>}
        </div>
    );
}

function MetricBox({ label, tooltip, children }) {
    return (
        <div style={{
            background: "var(--gray-50)", border: "1px solid var(--gray-200)",
            borderRadius: "var(--radius-md)", padding: "12px 14px",
        }}>
            <div style={{
                fontSize: 10.5, color: "var(--gray-500)", textTransform: "uppercase",
                letterSpacing: "0.5px", marginBottom: 6, display: "flex", alignItems: "center", gap: 4,
            }}>
                {label}
                {tooltip && (
                    <span title={tooltip} style={{ cursor: "help", color: "var(--gray-300)" }}>
                        ⓘ
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

function SavingValue({ amount }) {
    return (
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green-600)" }}>
            সাশ্রয় {bnTk(amount, 2)}
        </div>
    );
}

function EmptyMetric({ text }) {
    return <div style={{ fontSize: 12.5, color: "var(--gray-500)" }}>{text}</div>;
}