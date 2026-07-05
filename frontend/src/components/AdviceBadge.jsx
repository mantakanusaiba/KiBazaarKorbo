const CONFIG = {
    buy_now: {
        label: "আজ কিনুন",
        bg: "var(--green-600)",
        light: "var(--green-50)",
        border: "var(--green-100)",
        text: "var(--green-700)",
        icon: "🛒",
        pill: true,
    },
    wait: {
        label: "১–২ দিন অপেক্ষা করুন",
        bg: "var(--brand-600)",
        light: "var(--brand-50)",
        border: "var(--brand-100)",
        text: "var(--brand-700)",
        icon: "⏳",
        pill: true,
    },
    stable: {
        label: "দাম প্রায় একই",
        bg: "var(--gray-500)",
        light: "var(--gray-50)",
        border: "var(--gray-200)",
        text: "var(--gray-700)",
        icon: "✅",
        pill: true,
    },
};

export default function AdviceBadge({ advice, size = "md" }) {
    const c = CONFIG[advice] || CONFIG.stable;
    const isLg = size === "lg";

    return (
        <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: c.bg,
            color: "#fff",
            padding: isLg ? "8px 20px" : "4px 14px",
            borderRadius: 999,
            fontSize: isLg ? 15 : 13,
            fontWeight: 600,
            letterSpacing: "0.1px",
        }}>
            <span>{c.icon}</span>
            {c.label}
        </span>
    );
}

/** Inline card variant — shows advice with reason text */
export function AdviceCard({ advice, reason }) {
    const c = CONFIG[advice] || CONFIG.stable;
    return (
        <div style={{
            background: c.light,
            border: `1px solid ${c.border}`,
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
        }}>
            <span style={{ fontSize: 22, lineHeight: 1.2 }}>{c.icon}</span>
            <div>
                <div style={{ fontWeight: 700, color: c.text, fontSize: 15, marginBottom: 2 }}>
                    {c.label}
                </div>
                {reason && (
                    <div style={{ fontSize: 13, color: "var(--gray-700)", lineHeight: 1.5 }}>
                        {reason}
                    </div>
                )}
            </div>
        </div>
    );
}