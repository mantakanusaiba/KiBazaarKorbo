import { useState } from "react";
import { getExplanation, getForecast } from "../api/client";
import ProductSelector from "../components/ProductSelector";
import useSessionState from "../hooks/useSessionState";
import {
    computeConfidence,
    computeRisk,
    computeSavings,
    computeTrend,
} from "../utils/forecastMath";
import {
    formatProductName,
    getProductImage,
    translateApiText,
} from "../utils/productAssets";
import { bnNum, bnPct, bnTk } from "../utils/banglaFormat";

const ADVICE_UI = {
    buy_now: {
        icon: "✅",
        title: "আজ কিনুন",
        short: "এখন কিনলে ভালো হতে পারে",
        bg: "var(--hero-success-bg)",
        border: "var(--hero-border)",
        text: "var(--hero-success)",
    },
    wait: {
        icon: "⏳",
        title: "অপেক্ষা করুন",
        short: "কিছুদিন অপেক্ষা করলে ভালো হতে পারে",
        bg: "var(--amber-50)",
        border: "#fde68a",
        text: "var(--amber-600)",
    },
    stable: {
        icon: "✅",
        title: "দাম প্রায় একই",
        short: "দাম খুব বেশি বদলানোর সম্ভাবনা কম",
        bg: "var(--hero-success-bg)",
        border: "var(--hero-border)",
        text: "var(--hero-success)",
    },
};

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function normalizeAdvice(advice = "") {
    const text = String(advice).toLowerCase();

    if (
        text.includes("buy") ||
        text.includes("today") ||
        text.includes("now") ||
        text.includes("কিন")
    ) {
        return "buy_now";
    }

    if (text.includes("wait") || text.includes("অপেক্ষা")) {
        return "wait";
    }

    return "stable";
}

function getChangePct(result) {
    const current = safeNumber(result?.current_avg);
    const next = safeNumber(result?.predicted_tomorrow);

    if (!current || !next) return 0;

    return ((next - current) / current) * 100;
}

function getChangeColor(changePct) {
    if (changePct > 1) return "var(--red-600)";
    if (changePct < -1) return "var(--hero-success)";
    return "var(--hero-text)";
}

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
            setError(e.message || "ফোরকাস্ট করা যায়নি।");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-enter">
            <ForecastHero selected={selected} />

            <div
                style={{
                    padding: 16,
                    marginBottom: 18,
                    borderRadius: 22,
                    background: "#ffffff",
                    border: "1px solid var(--lemon-border)",
                    boxShadow: "0 12px 30px rgba(47, 93, 40, 0.06)",
                }}
            >
                <div style={{ display: "grid", gap: 12 }}>
                    <ProductSelector value={selected} onChange={setSelected} />

                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 10,
                            alignItems: "center",
                        }}
                    >
                        <button
                            onClick={run}
                            disabled={loading || !selected}
                            className="mm-btn"
                            style={{
                                minWidth: 180,
                                boxShadow: "0 12px 24px rgba(93, 163, 61, 0.24)",
                            }}
                        >
                            {loading ? "মডেল চলছে…" : "ফোরকাস্ট দেখুন"}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert-error" style={{ marginBottom: 18 }}>
                    ⚠️ {error}
                </div>
            )}

            {loading && (
                <div className="simple-model-loader">
                    <div className="simple-spinner"></div>
                    <p>AI মডেল ফোরকাস্ট তৈরি করছে...</p>
                </div>
            )}

            {result && (
                <div style={{ display: "grid", gap: 18 }}>
                    <MainForecastCard selected={selected} result={result} week={week} />

                    <AIReasonCard result={result} />

                    {week.length > 0 && (
                        <FuturePriceCard week={week} currentAvg={result.current_avg} />
                    )}
                </div>
            )}
        </div>
    );
}

function ForecastHero({ selected }) {
    const image = selected ? getProductImage(selected) : getProductImage("mango_fazli");

    return (
        <section
            style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 28,
                marginBottom: 20,
                padding: "38px 42px",
                minHeight: 210,
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 340px",
                gap: 28,
                alignItems: "center",
                background:
                    "linear-gradient(135deg, #F5FAEF 0%, #EEF7E7 35%, #F8FCF5 70%, #EAF6E1 100%)",
                border: "1px solid var(--hero-border)",
                boxShadow: "0 18px 40px rgba(47, 93, 40, 0.1)",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.4,
                    backgroundImage:
                        "radial-gradient(circle at 1px 1px, var(--hero-border) 1px, transparent 0)",
                    backgroundSize: "18px 18px",
                }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
                <h1
                    style={{
                        margin: 0,
                        maxWidth: 520,
                        fontFamily: "var(--font-display)",
                        fontSize: 34,
                        lineHeight: 1.18,
                        letterSpacing: "-0.8px",
                        color: "var(--hero-heading)",
                    }}
                >
                    আজ কিনবো,
                    <br />
                    নাকি অপেক্ষা করবো?
                </h1>

                <p
                    style={{
                        maxWidth: 590,
                        margin: "12px 0 0",
                        fontSize: 14.5,
                        lineHeight: 1.8,
                        color: "var(--hero-text)",
                        fontWeight: 600,
                    }}
                >
                    গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের কৃষি সেবা পোর্টাল ডাটা , দামের ট্রেন্ড, আবহাওয়া, সপ্তাহান্ত ও ছুটির তথ্য দেখে AI সহজ ভাষায় পরামর্শ দেয়।
                </p>
            </div>

            <div
                style={{
                    position: "relative",
                    zIndex: 1,
                    height: 190,
                    borderRadius: 26,
                    background: "var(--hero-card)",
                    border: "10px solid rgba(255,255,255,0.72)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    boxShadow: "0 18px 34px rgba(47, 93, 40, 0.1)",
                    padding: 14,
                }}
            >
                <img
                    src={image}
                    alt="পণ্য"
                    style={{
                        display: "block",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        objectPosition: "center center",
                        filter: "drop-shadow(0 18px 24px rgba(47,93,40,0.16))",
                    }}
                />
            </div>
        </section>
    );
}

function MainForecastCard({ selected, result, week }) {
    const adviceKey = normalizeAdvice(result.advice);
    const advice = ADVICE_UI[adviceKey] || ADVICE_UI.stable;

    const changePct = getChangePct(result);
    const changeColor = getChangeColor(changePct);

    const confidence = computeConfidence(
        result.predicted_low,
        result.predicted_high,
        result.predicted_tomorrow
    );

    const risk = confidence ? computeRisk(confidence.bandPct) : null;

    const savings = computeSavings({
        currentAvg: result.current_avg,
        predictedTomorrow: result.predicted_tomorrow,
        week,
    });

    return (
        <section
            style={{
                padding: 0,
                borderRadius: 24,
                overflow: "hidden",
                background: "#ffffff",
                border: "1px solid var(--lemon-border)",
                boxShadow: "0 18px 45px rgba(47, 93, 40, 0.07)",
            }}
        >
            <div
                style={{
                    padding: "20px 22px",
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 300px",
                    gap: 18,
                    alignItems: "start",
                }}
            >
                <div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 8,
                        }}
                    >
                        <div>
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: 26,
                                    fontFamily: "var(--font-display)",
                                    color: "var(--hero-heading)",
                                    letterSpacing: "-0.3px",
                                }}
                            >
                                {formatProductName(selected)}
                            </h2>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        background: advice.bg,
                        border: `1px solid ${advice.border}`,
                        borderRadius: 18,
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                    }}
                >
                    <span style={{ fontSize: 26 }}>{advice.icon}</span>

                    <div>
                        <div
                            style={{
                                fontSize: 17,
                                fontWeight: 950,
                                color: advice.text,
                                marginBottom: 4,
                            }}
                        >
                            {advice.title}
                        </div>

                        <div
                            style={{
                                fontSize: 14,
                                color: "var(--hero-text)",
                                lineHeight: 1.6,
                            }}
                        >
                            {advice.short}
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    borderTop: "1px solid var(--lemon-border)",
                    borderBottom: "1px solid var(--lemon-border)",
                    background: "#ffffff",
                }}
            >
                <PriceColumn
                    label="এখনকার বাজার দাম"
                    value={bnTk(result.current_avg, 2)}
                    sub="লাইভ/সর্বশেষ ডাটা"
                    tone="var(--hero-heading)"
                />

                <PriceColumn
                    label="পরের আপডেটে সম্ভাব্য দাম"
                    value={bnTk(result.predicted_tomorrow, 2)}
                    sub={
                        result.predicted_low != null
                            ? `${bnTk(result.predicted_low, 2)} - ${bnTk(result.predicted_high, 2)}`
                            : "সম্ভাব্য সীমা নেই"
                    }
                    tone="var(--hero-price)"
                />

                <PriceColumn
                    label="সম্ভাব্য পরিবর্তন"
                    value={`${changePct > 0 ? "+" : ""}${bnPct(changePct, 2)}`}
                    sub={
                        changePct < 0
                            ? "দাম কমতে পারে"
                            : changePct > 0
                                ? "দাম বাড়তে পারে"
                                : "প্রায় একই"
                    }
                    tone={changeColor}
                />

                <PriceColumn
                    label="সাশ্রয়ের ধারণা"
                    value={
                        savings.buyTodaySaving > 0
                            ? bnTk(savings.buyTodaySaving, 2)
                            : savings.waitSaving > 0
                                ? bnTk(savings.waitSaving, 2)
                                : "৳০"
                    }
                    sub={
                        savings.buyTodaySaving > 0
                            ? "আজ কিনলে সাশ্রয়"
                            : savings.waitSaving > 0
                                ? "অপেক্ষা করলে সাশ্রয়"
                                : "বড় সাশ্রয় নেই"
                    }
                    tone="var(--hero-price)"
                />
            </div>

            <div style={{ padding: "16px 22px" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 12,
                    }}
                >
                    <SmallMetric
                        label="মডেলের ভরসা"
                        value={
                            confidence
                                ? `${"★".repeat(confidence.stars)}${"☆".repeat(5 - confidence.stars)}`
                                : "ডাটা কম"
                        }
                        sub={confidence ? `${bnNum(confidence.confidencePct)}%` : ""}
                    />

                    <SmallMetric
                        label="ঝুঁকি মাত্রা"
                        value={risk?.label || "ডাটা কম"}
                        sub="দামের ওঠানামা দেখে"
                    />

                    <SmallMetric
                        label="এখন কিনলে কী হবে?"
                        value={
                            savings.buyTodaySaving > 0
                                ? `সাশ্রয় ${bnTk(savings.buyTodaySaving, 2)}`
                                : "আলাদা লাভ নেই"
                        }
                        sub="পরের আপডেটের তুলনায়"
                    />

                    <SmallMetric
                        label="২ দিন অপেক্ষা করলে"
                        value={
                            savings.waitSaving > 0
                                ? `সাশ্রয় ${bnTk(savings.waitSaving, 2)}`
                                : "সাশ্রয় কম"
                        }
                        sub="ধারণা করা দাম দেখে"
                    />
                </div>
            </div>
        </section>
    );
}

function PriceColumn({ label, value, sub, tone }) {
    return (
        <div
            style={{
                padding: "18px 20px",
                borderRight: "1px solid var(--lemon-border)",
                minHeight: 96,
            }}
        >
            <div
                style={{
                    fontSize: 13,
                    color: "var(--hero-text-light)",
                    fontWeight: 900,
                    marginBottom: 7,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 30,
                    fontWeight: 950,
                    color: tone,
                    letterSpacing: "-0.5px",
                }}
            >
                {value}
            </div>

            {sub && (
                <div
                    style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: "var(--hero-text-light)",
                    }}
                >
                    {sub}
                </div>
            )}
        </div>
    );
}

function SmallMetric({ label, value, sub }) {
    return (
        <div
            style={{
                background: "#ffffff",
                border: "1px solid var(--lemon-border)",
                borderRadius: 16,
                padding: "13px 14px",
            }}
        >
            <div
                style={{
                    fontSize: 13,
                    color: "var(--hero-text-light)",
                    fontWeight: 800,
                    marginBottom: 7,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontSize: 16,
                    fontWeight: 950,
                    color: "var(--hero-heading)",
                }}
            >
                {value}
            </div>

            {sub && (
                <div
                    style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: "var(--hero-text-light)",
                    }}
                >
                    {sub}
                </div>
            )}
        </div>
    );
}

function AIReasonCard({ result }) {
    const explanation =
        translateApiText(result.explanation) ||
        translateApiText(result.reason) ||
        "সাম্প্রতিক দাম, বাজারের ধরণ, আবহাওয়া ও ছুটির তথ্য মিলিয়ে এই পরামর্শ দেওয়া হয়েছে।";

    const points = explanation
        .split(/।\s*/)
        .map((s) => s.trim())
        .filter(Boolean);

    return (
        <section
            style={{
                padding: "20px 22px",
                borderRadius: 22,
                background: "#ffffff",
                border: "1px solid var(--lemon-border)",
                boxShadow: "0 14px 34px rgba(47, 93, 40, 0.06)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 950,
                    color: "var(--hero-heading)",
                    marginBottom: 12,
                    fontSize: 19,
                }}
            >
                AI কেন এই পরামর্শ দিচ্ছে?
            </div>

            <div
                style={{
                    background: "#ffffff",
                    border: "1px solid var(--lemon-border)",
                    borderRadius: 16,
                    padding: "14px 16px",
                }}
            >
                <ul className="ai-summary-list">
                    {points.map((point, index) => (
                        <li
                            key={index}
                            style={{
                                fontSize: 16,
                                lineHeight: 1.7,
                                color: "var(--hero-text)",
                            }}
                        >
                            {point}।
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

function FuturePriceCard({ week, currentAvg }) {
    const trend = computeTrend(week);

    return (
        <section
            style={{
                borderRadius: 22,
                padding: "20px 22px",
                background: "#ffffff",
                border: "1px solid var(--lemon-border)",
                boxShadow: "0 14px 34px rgba(47, 93, 40, 0.08)",
                overflow: "hidden",
                position: "relative",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    right: 10,
                    bottom: -18,
                    fontSize: 94,
                    opacity: 0.12,
                }}
            >
                📈
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
                <h3
                    style={{
                        margin: "0 0 14px",
                        fontSize: 19,
                        fontWeight: 950,
                        color: "var(--hero-heading)",
                    }}
                >
                    দামের আগাম ধারণা
                </h3>

                <div
                    style={{
                        display: "flex",
                        gap: 0,
                        overflowX: "auto",
                        paddingBottom: 4,
                    }}
                >
                    <FutureStep label="এখনকার দাম" price={currentAvg} />

                    {week.slice(0, 7).map((item, index) => (
                        <FutureStep
                            key={item.day || index}
                            label={
                                item.day === 1
                                    ? "পরের আপডেট"
                                    : `${bnNum(item.day)} দিন পরে`
                            }
                            price={item.predicted_price}
                            tone={getChangeColor(safeNumber(item.change_pct))}
                            festival={item.is_festival}
                        />
                    ))}
                </div>

                <p
                    style={{
                        margin: "14px 0 0",
                        fontSize: 15,
                        color: "var(--hero-heading)",
                        lineHeight: 1.7,
                        fontWeight: 700,
                    }}
                >
                    {trend?.direction === "falling" &&
                        "সামনের আপডেটে দাম কিছুটা কমতে পারে। জরুরি না হলে একটু অপেক্ষা করলে লাভ হতে পারে।"}
                    {trend?.direction === "rising" &&
                        "সামনের আপডেটে দাম বাড়তে পারে। দরকার হলে আজ কিনে নেওয়া ভালো।"}
                    {(!trend || trend.direction === "stable") &&
                        "সামনের আপডেটে দাম খুব বেশি বদলানোর সম্ভাবনা কম।"}
                </p>
            </div>
        </section>
    );
}

function FutureStep({ label, price, tone = "var(--hero-heading)", festival }) {
    return (
        <div
            style={{
                minWidth: 150,
                padding: "0 20px",
                borderLeft: "1px dashed var(--lemon-border)",
            }}
        >
            <div
                style={{
                    fontSize: 13,
                    color: "var(--hero-text-light)",
                    marginBottom: 6,
                    fontWeight: 800,
                }}
            >
                {label} {festival ? "🎉" : ""}
            </div>

            <div
                style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 950,
                    fontSize: 24,
                    color: tone,
                    letterSpacing: "-0.4px",
                }}
            >
                {bnTk(price, 2)}
            </div>
        </div>
    );
}