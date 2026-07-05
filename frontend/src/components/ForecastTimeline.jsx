import { computeTrend } from "../utils/forecastMath";
import { bnNum, bnTk } from "../utils/banglaFormat";

function forecastStepLabel(day) {
    const n = Number(day);

    if (n === 1) return "পরের আপডেট";
    return `${bnNum(n)} ধাপ পরে`;
}

export default function ForecastTimeline({ week, currentAvg }) {
    if (!week || week.length === 0) return null;

    const trend = computeTrend(week);

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    overflowX: "auto",
                    paddingBottom: 6,
                    gap: 0,
                }}
            >
                <TimelineStop label="এখনকার দাম" price={currentAvg} first />

                {week.map((d, index) => (
                    <TimelineStop
                        key={d.day || index}
                        label={forecastStepLabel(d.day || index + 1)}
                        price={d.predicted_price}
                        changePct={d.change_pct}
                        special={d.is_festival ? "🎉" : null}
                    />
                ))}
            </div>

            {trend && (
                <p
                    style={{
                        fontSize: 13,
                        color: "var(--gray-500)",
                        marginTop: 10,
                    }}
                >
                    {trend.direction === "rising" &&
                        "মডেল বলছে সামনে দাম কিছুটা বাড়তে পারে।"}
                    {trend.direction === "falling" &&
                        "মডেল বলছে সামনে দাম কিছুটা কমতে পারে।"}
                    {trend.direction === "stable" &&
                        "মডেল বলছে সামনে দাম প্রায় একই থাকতে পারে।"}
                </p>
            )}

            <p
                style={{
                    fontSize: 11.5,
                    color: "var(--gray-400)",
                    marginTop: 6,
                    lineHeight: 1.6,
                }}
            >
                বাজারের ডাটায় অনেক সময় ছুটি বা সপ্তাহান্তে তথ্য থাকে না, তাই এখানে তারিখ না দিয়ে আপডেট ধাপ দেখানো হয়েছে।
            </p>
        </div>
    );
}

function TimelineStop({ label, price, changePct, special, first }) {
    const color =
        changePct > 2
            ? "var(--red-600)"
            : changePct < -2
                ? "var(--green-600)"
                : "var(--gray-900)";

    return (
        <div
            style={{
                flex: "0 0 auto",
                minWidth: 130,
                textAlign: "center",
                padding: "0 16px",
                borderLeft: first ? "none" : "1px dashed var(--gray-200)",
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    color: "var(--gray-500)",
                    letterSpacing: "0.4px",
                    marginBottom: 4,
                }}
            >
                {label} {special}
            </div>

            <div
                style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 17,
                    fontWeight: 700,
                    color,
                }}
            >
                {bnTk(price, 2)}
            </div>
        </div>
    );
}