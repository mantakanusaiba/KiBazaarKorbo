export default function ExplanationBox({ text, loading }) {
    if (loading) {
        return (
            <div style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "var(--radius-md)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "#0369a1",
                fontSize: 14,
            }}>
                <span style={{
                    width: 18, height: 18,
                    border: "2px solid #bae6fd",
                    borderTopColor: "#0369a1",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                    flexShrink: 0,
                }} />
                Generating AI explanation in English &amp; Bangla…
            </div>
        );
    }

    if (!text) return null;

    return (
        <div style={{
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                fontSize: 12,
                fontWeight: 600,
                color: "#0369a1",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
            }}>
                <span>🤖</span>
                AI Explanation
            </div>
            <p style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: "var(--gray-700)",
                whiteSpace: "pre-wrap",
                margin: 0,
            }}>
                {text}
            </p>
        </div>
    );
}