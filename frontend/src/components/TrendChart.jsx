import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: "var(--surface)",
            border: "1px solid var(--gray-200)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            boxShadow: "var(--shadow-sm)",
            fontSize: 13,
        }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--gray-700)" }}>{label}</div>
            {payload.map(p => (
                <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
                    {p.name}: ৳{Number(p.value).toFixed(2)}
                </div>
            ))}
        </div>
    );
};

export default function TrendChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div style={{
                height: 240,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--gray-500)",
                fontSize: 14,
                background: "var(--gray-50)",
                borderRadius: "var(--radius-md)",
            }}>
                No historical data available.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                    tickFormatter={v => v.slice(5)}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fontSize: 11, fill: "var(--gray-500)" }}
                    tickFormatter={v => `৳${v}`}
                    width={60}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Line
                    type="monotone"
                    dataKey="avg_price"
                    name="Avg"
                    stroke="var(--brand-600)"
                    dot={false}
                    strokeWidth={2.5}
                    activeDot={{ r: 4 }}
                />
                <Line
                    type="monotone"
                    dataKey="min_price"
                    name="Min"
                    stroke="var(--green-600)"
                    dot={false}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                />
                <Line
                    type="monotone"
                    dataKey="max_price"
                    name="Max"
                    stroke="var(--red-600)"
                    dot={false}
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}