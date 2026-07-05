import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
    CartesianGrid,
} from "recharts";
import { bnNum, bnTk, toBnDigits } from "../utils/banglaFormat";

function formatDateLabel(value) {
    if (!value) return "";

    const text = String(value);

    // 2026-06-01 -> ০৬-০১
    if (text.includes("-")) {
        return toBnDigits(text.slice(5));
    }

    return toBnDigits(text);
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
        <div
            style={{
                background: "var(--surface)",
                border: "1px solid var(--gray-200)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                boxShadow: "var(--shadow-sm)",
                fontSize: 13,
            }}
        >
            <div
                style={{
                    fontWeight: 700,
                    marginBottom: 6,
                    color: "var(--gray-700)",
                }}
            >
                {formatDateLabel(label)}
            </div>

            {payload.map((p) => (
                <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
                    {p.name}: {bnTk(p.value, 2)}
                </div>
            ))}
        </div>
    );
};

export default function TrendChart({ data, hideDates = false }) {
    if (!data || data.length === 0) {
        return (
            <div
                style={{
                    height: 240,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--gray-500)",
                    fontSize: 14,
                    background: "var(--gray-50)",
                    borderRadius: "var(--radius-md)",
                }}
            >
                এই পণ্যের আগের দামের ডাটা পাওয়া যায়নি।
            </div>
        );
    }

    const chartData = hideDates
        ? data.map((d, idx) => ({
              ...d,
              relativeLabel:
                  idx === data.length - 1
                      ? "সর্বশেষ"
                      : `${bnNum(data.length - 1 - idx)} ধাপ আগে`,
          }))
        : data;

    return (
        <ResponsiveContainer width="100%" height={280}>
            <LineChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
            >
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--gray-200)"
                    vertical={false}
                />

                <XAxis
                    dataKey={hideDates ? "relativeLabel" : "date"}
                    tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                    tickFormatter={(v) => (hideDates ? v : formatDateLabel(v))}
                    axisLine={false}
                    tickLine={false}
                />

                <YAxis
                    tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                    tickFormatter={(v) => bnTk(v, 0)}
                    width={64}
                    axisLine={false}
                    tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Legend
                    wrapperStyle={{
                        fontSize: 12,
                        paddingTop: 8,
                    }}
                />

                <Line
                    type="monotone"
                    dataKey="avg_price"
                    name="গড়"
                    stroke="var(--brand-600)"
                    dot={false}
                    strokeWidth={2.5}
                    activeDot={{ r: 4 }}
                />

                <Line
                    type="monotone"
                    dataKey="min_price"
                    name="সর্বনিম্ন"
                    stroke="var(--green-600)"
                    dot={false}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                />

                <Line
                    type="monotone"
                    dataKey="max_price"
                    name="সর্বোচ্চ"
                    stroke="var(--red-600)"
                    dot={false}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}