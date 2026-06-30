export default function PriceCard({ product, min, max, avg, unit, market, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                border: "1px solid var(--gray-200)",
                borderRadius: "var(--radius-md)",
                padding: "18px 20px",
                background: "var(--surface)",
                boxShadow: "var(--shadow-xs)",
                cursor: onClick ? "pointer" : "default",
                transition: "box-shadow 0.15s, transform 0.15s",
                position: "relative",
                overflow: "hidden",
            }}
            onMouseEnter={e => {
                if (onClick) {
                    e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                }
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                e.currentTarget.style.transform = "translateY(0)";
            }}
        >
            {/* accent bar */}
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0,
                height: 3,
                background: "linear-gradient(90deg, var(--brand-600), var(--brand-500))",
                borderRadius: "var(--radius-md) var(--radius-md) 0 0",
            }} />

            <div style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--gray-700)",
                marginBottom: 4,
                marginTop: 4,
            }}>
                {product}
            </div>

            {market && (
                <div style={{ fontSize: 11, color: "var(--gray-500)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {market}
                </div>
            )}

            <div style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 700,
                color: "var(--brand-600)",
                letterSpacing: "-0.5px",
                lineHeight: 1.1,
                marginBottom: 2,
            }}>
                ৳{Number(avg).toFixed(2)}
                <span style={{ fontSize: 12, fontWeight: 400, color: "var(--gray-500)", marginLeft: 4 }}>
                    / {unit || "kg"}
                </span>
            </div>

            <div style={{
                fontSize: 12,
                color: "var(--gray-500)",
                marginTop: 6,
                display: "flex",
                gap: 10,
            }}>
                <span style={{ color: "var(--green-600)" }}>↓ ৳{Number(min).toFixed(0)}</span>
                <span style={{ color: "var(--red-600)" }}>↑ ৳{Number(max).toFixed(0)}</span>
            </div>
        </div>
    );
}