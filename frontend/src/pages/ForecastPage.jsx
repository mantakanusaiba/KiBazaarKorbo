import { useState } from "react";
import { getExplanation, getForecast } from "../api/client";
import DecisionSummary from "../components/DecisionSummary";
import ExplanationBox from "../components/ExplanationBox";
import WhyFactors from "../components/WhyFactors";
import ForecastTimeline from "../components/ForecastTimeline";
import ProductSelector, { toLabel } from "../components/ProductSelector";
import { marketLabel } from "../data/marketRegions";
import useSessionState from "../hooks/useSessionState";
import {
    getCategoryMeta,
    getProductCategory,
    getProductImage,
    translateApiText,
} from "../utils/productAssets";

export default function ForecastPage() {
    const [selected, setSelected] = useSessionState("forecast_selected_product", "");
    const [result, setResult] = useSessionState("forecast_result", null);
    const [week, setWeek] = useSessionState("forecast_week_result", []);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = async () => {
        if (!selected) return;

        setLoading(true);
        setResult(null);
        setWeek([]);
        setError(null);

        try {
            const explRes = await getExplanation(selected);

            if (explRes.data?.error) {
                throw new Error(explRes.data.error);
            }

            setResult(explRes.data);

            const forecastMarket = explRes.data.market;
            const weekRes = await getForecast(selected, forecastMarket, 7);

            if (!weekRes.data?.error) {
                setWeek(weekRes.data.forecast || []);
            }
        } catch (e) {
            setError(e.message || "ফোরকাস্ট করা যায়নি।");
        } finally {
            setLoading(false);
        }
    };

    const meta = selected
        ? getCategoryMeta(getProductCategory(selected))
        : null;

    return (
        <div className="page-enter">
            <section
                className="page-hero"
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.1fr) 240px",
                    gap: 24,
                    alignItems: "center",
                    marginBottom: 20,
                }}
            >
                <div>
                    <div className="hero-kicker">📈 AI দিয়ে দামের ফোরকাস্ট</div>

                    <h1 className="page-title">আজ কিনবো, নাকি অপেক্ষা করবো?</h1>

                    <p className="page-subtitle">
                        DAM ডাটা, দামের ট্রেন্ড, আবহাওয়া, সপ্তাহান্ত ও ছুটির তথ্য দেখে AI সহজভাবে পরামর্শ দেয়।
                    </p>
                </div>

                {selected && (
                    <div
                        style={{
                            height: 210,
                            borderRadius: 28,
                            background: "rgba(255,255,255,0.18)",
                            display: "grid",
                            placeItems: "center",
                            overflow: "hidden",
                        }}
                    >
                        <img
                            src={getProductImage(selected)}
                            alt={toLabel(selected)}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                padding: 18,
                                filter: "drop-shadow(0 24px 30px rgba(0,0,0,0.22))",
                            }}
                        />
                    </div>
                )}
            </section>

            <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                    }}
                >
                    <ProductSelector value={selected} onChange={setSelected} />

                    <button
                        onClick={run}
                        disabled={loading || !selected}
                        className="mm-btn"
                    >
                        {loading ? "মডেল চলছে…" : "ফোরকাস্ট দেখুন"}
                    </button>

                    {selected && meta && (
                        <div className="product-category" style={{ marginBottom: 0 }}>
                            {meta.icon} {meta.label}
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="alert-error" style={{ marginBottom: 20 }}>
                    ⚠️ {error}
                </div>
            )}

            {result && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <DecisionSummary
                        productLabel={toLabel(selected)}
                        marketName={marketLabel(result.market)}
                        result={result}
                        week={week}
                    />

                    <SectionCard title="AI কেন এই পরামর্শ দিচ্ছে?">
                        <ExplanationBox text={translateApiText(result.explanation)} />

                        <ForecastSignals result={result} />

                        {result.top_factors?.length > 0 && (
                            <div style={{ marginTop: 14 }}>
                                <WhyFactors factors={result.top_factors} />
                            </div>
                        )}
                    </SectionCard>

                    {week.length > 0 && (
                        <SectionCard title="দামের আগাম ধারণা">
                            <ForecastTimeline
                                week={week}
                                currentAvg={result.current_avg}
                            />
                        </SectionCard>
                    )}
                </div>
            )}
        </div>
    );
}

function SectionCard({ title, children }) {
    return (
        <div className="glass-card" style={{ padding: "20px 22px" }}>
            <div
                style={{
                    fontWeight: 950,
                    fontSize: 16,
                    color: "var(--gray-900)",
                    marginBottom: 12,
                }}
            >
                {title}
            </div>

            {children}
        </div>
    );
}

function ForecastSignals({ result }) {
    if (!result) return null;

    const rain =
        typeof result.rainfall_mm === "number"
            ? `${result.rainfall_mm} মিমি বৃষ্টি`
            : "বৃষ্টির ডাটা নেই";

    const temp =
        typeof result.temp_avg_c === "number"
            ? `${result.temp_avg_c}°C গড় তাপমাত্রা`
            : "তাপমাত্রার ডাটা নেই";

    const calendar = result.is_festival
        ? "উৎসব/ছুটির প্রভাব ধরা হয়েছে"
        : result.is_weekend
            ? "সপ্তাহান্তের প্রভাব ধরা হয়েছে"
            : "উৎসব/সপ্তাহান্তের আলাদা প্রভাব নেই";

    return (
        <div
            style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 12,
            }}
        >
            <SignalChip icon="🌧️" text={rain} />
            <SignalChip icon="🌡️" text={temp} />
            <SignalChip icon="📅" text={calendar} />
        </div>
    );
}

function SignalChip({ icon, text }) {
    return (
        <span
            className="category-chip"
            style={{
                padding: "7px 11px",
                boxShadow: "none",
            }}
        >
            <span>{icon}</span>
            {text}
        </span>
    );
}