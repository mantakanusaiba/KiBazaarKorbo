export default function ExplanationBox({ text, loading }) {
    if (loading) {
        return (
            <div style={boxStyle}>
                <span style={{
                    width: 18,
                    height: 18,
                    border: "2px solid #bae6fd",
                    borderTopColor: "#0369a1",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                    flexShrink: 0,
                }} />
                <span style={{ color: "#0369a1", fontSize: 14 }}>
                    AI explanation তৈরি হচ্ছে…
                </span>
            </div>
        );
    }

    if (!text) return null;

    return (
        <div style={boxStyle}>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                fontSize: 12,
                fontWeight: 700,
                color: "#0369a1",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
            }}>
                <span>🤖</span>
                AI ব্যাখ্যা
            </div>
            <div style={{
                fontSize: 14.5,
                lineHeight: 1.85,
                color: "var(--gray-800)",
                whiteSpace: "pre-line",
                margin: 0,
                wordBreak: "break-word",
            }}>
                {text}
            </div>
        </div>
    );
}

const boxStyle = {
    background: "linear-gradient(180deg, #f0f9ff 0%, #eef8ff 100%)",
    border: "1px solid #bae6fd",
    borderRadius: "var(--radius-md)",
    padding: "17px 20px",
    boxShadow: "0 1px 0 rgba(3, 105, 161, 0.04)",
};
