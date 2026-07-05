import {
    ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, ReferenceDot,
} from "recharts";
import { translateApiText } from "../utils/productAssets";

function forecastStepLabel(day) {
    if (day === 1) return "পরের";
    return `+${day}`;
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;
    return (
        <div style={{
            background: "var(--surface)",
            border: "1px solid var(--gray-200)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            boxShadow: "var(--shadow-sm)",
            fontSize: 13,
            maxWidth: 220,
        }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--gray-700)" }}>
                {label} {row.is_festival ? "🎉" : ""}
            </div>
            <div style={{ color: "var(--brand-600)", fontWeight: 600 }}>
                ৳{Number(row.predicted_price).toFixed(2)}
            </div>
            <div style={{ color: "var(--gray-500)", fontSize: 12, marginTop: 2 }}>
                সম্ভাব্য দাম: ৳{Number(row.predicted_low).toFixed(2)} – ৳{Number(row.predicted_high).toFixed(2)}
            </div>
            {row.top_factors?.length > 0 && (
                <div style={{ marginTop: 8, borderTop: "1px solid var(--gray-100)", paddingTop: 6 }}>
                    {row.top_factors.slice(0, 2).map(f => (
                        <div key={f.feature} style={{ color: "var(--gray-700)", fontSize: 11.5, marginBottom: 2 }}>
                            {f.direction === "up" ? "↑" : "↓"} {translateApiText(f.label_bn || f.label_en || f.feature)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function ForecastBandChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div style={{
                height: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--gray-500)",
                fontSize: 14,
                background: "var(--gray-50)",
                borderRadius: "var(--radius-md)",
            }}>
                ফোরকাস্ট পাওয়া যায়নি।
            </div>
        );
    }

    const chartData = data.map(d => ({
        ...d,
        forecastLabel: forecastStepLabel(d.day),
    }));

    const specialDay = chartData.find(d => d.is_festival);

    return (
        <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
                <XAxis
                    dataKey="forecastLabel"
                    tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                    tickFormatter={v => `৳${v}`}
                    width={60}
                    axisLine={false}
                    tickLine={false}
                    domain={["dataMin - 2", "dataMax + 2"]}
                />
                <Tooltip content={<CustomTooltip />} />

                <Area
                    dataKey={d => [d.predicted_low, d.predicted_high]}
                    stroke="none"
                    fill="var(--brand-100)"
                    fillOpacity={0.7}
                    isAnimationActive={false}
                    name="সম্ভাব্য সীমা"
                />

                <Line
                    type="monotone"
                    dataKey="predicted_price"
                    name="ধারণা করা দাম"
                    stroke="var(--brand-600)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--brand-600)" }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                />

                {specialDay && (
                    <ReferenceDot
                        x={specialDay.forecastLabel}
                        y={specialDay.predicted_price}
                        r={6}
                        fill="var(--amber-600)"
                        stroke="#fff"
                        strokeWidth={2}
                    />
                )}
            </ComposedChart>
        </ResponsiveContainer>
    );
}
