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

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function normalizeChartData(data = []) {
    return data.map((row) => {
        const avg = safeNumber(
            row.avg_price ??
            row.average_price ??
            row.price ??
            row.current_price
        );

        const min = safeNumber(
            row.min_price ??
            row.minimum_price ??
            row.low_price
        ) || avg;

        const max = safeNumber(
            row.max_price ??
            row.maximum_price ??
            row.high_price
        ) || avg;

        return {
            ...row,
            date: row.date || row.Date || row.DATE || row.ds,
            avg_price: avg,
            min_price: min,
            max_price: max,
        };
    });
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

    const normalizedData = normalizeChartData(data);

    const chartData = hideDates
        ? normalizedData.map((d, idx) => ({
            ...d,
            relativeLabel:
                idx === normalizedData.length - 1
                    ? "সর্বশেষ"
                    : `${bnNum(normalizedData.length - 1 - idx)} ধাপ আগে`,
        }))
        : normalizedData;

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart
                data={chartData}
                margin={{ top: 10, right: 18, left: 4, bottom: 12 }}
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
                    interval="preserveStartEnd"
                />

                <YAxis
                    tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                    tickFormatter={(v) => bnTk(v, 0)}
                    width={64}
                    axisLine={false}
                    tickLine={false}
                    domain={["dataMin - 5", "dataMax + 5"]}
                />

                <Tooltip content={<CustomTooltip />} />

                <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{
                        fontSize: 12,
                        paddingTop: 12,
                    }}
                />

                <Line
                    type="monotone"
                    dataKey="avg_price"
                    name="গড়"
                    stroke="var(--brand-600)"
                    dot={false}
                    strokeWidth={3}
                    activeDot={{ r: 5 }}
                />

                <Line
                    type="monotone"
                    dataKey="min_price"
                    name="সর্বনিম্ন"
                    stroke="#2563eb"
                    dot={false}
                    strokeDasharray="7 4"
                    strokeWidth={2.4}
                    activeDot={{ r: 5 }}
                />

                <Line
                    type="monotone"
                    dataKey="max_price"
                    name="সর্বোচ্চ"
                    stroke="var(--red-600)"
                    dot={false}
                    strokeDasharray="7 4"
                    strokeWidth={2.4}
                    activeDot={{ r: 5 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}