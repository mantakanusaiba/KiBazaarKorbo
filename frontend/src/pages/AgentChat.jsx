import { useMemo, useRef, useState } from "react";
import { postAgentChat } from "../api/client";

const QUICK_PROMPTS = [
    "এই সপ্তাহে ইলিশ মাছ কেনা কি ভালো সময়?",
    "আমি ৮০ টাকায় পেঁয়াজ কিনেছি, আমি কি ঠকেছি?",
    "ঢাকা বিভাগে ৫০০ টাকার মধ্যে ৪ জনের জন্য বাজার তালিকা বানাও",
    "আলু কোন বাজারে সবচেয়ে কম দামে পাওয়া যাচ্ছে?",
];

const roleLabel = {
    user: "আপনি",
    assistant: "AI সহকারী",
};

function ToolBadge({ tool }) {
    const label = {
        get_forecast: "দাম ফোরকাস্ট",
        get_market_comparison: "বাজার তুলনা",
        optimize_basket: "বাজার লিস্ট অপটিমাইজ",
        fair_price_check: "ঠিক দাম যাচাই",
        get_price_history: "আগের দাম",
    }[tool] || tool;

    return (
        <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 9px",
            borderRadius: 999,
            background: "#ecfdf5",
            color: "#047857",
            border: "1px solid #bbf7d0",
            fontSize: 12,
            fontWeight: 700,
        }}>
            ⚙️ {label}
        </span>
    );
}

function MessageCard({ message }) {
    const isUser = message.role === "user";
    return (
        <div style={{
            display: "flex",
            justifyContent: isUser ? "flex-end" : "flex-start",
            marginBottom: 14,
        }}>
            <div style={{
                maxWidth: "82%",
                padding: "14px 16px",
                borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isUser
                    ? "linear-gradient(135deg, #059669, #10b981)"
                    : "#ffffff",
                color: isUser ? "#fff" : "#172033",
                boxShadow: isUser
                    ? "0 10px 24px rgba(5, 150, 105, 0.22)"
                    : "0 10px 28px rgba(15, 23, 42, 0.08)",
                border: isUser ? "none" : "1px solid #e5e7eb",
                whiteSpace: "pre-wrap",
                lineHeight: 1.65,
            }}>
                <div style={{
                    fontSize: 12,
                    fontWeight: 800,
                    opacity: isUser ? 0.85 : 0.65,
                    marginBottom: 6,
                }}>
                    {roleLabel[message.role]}
                </div>
                <div>{message.content}</div>
                {!!message.tools?.length && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                        {message.tools.map((t, idx) => <ToolBadge key={`${t}-${idx}`} tool={t} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AgentChat() {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "আমি আপনার AI বাজার সহকারী। সাধারণ প্রশ্নে সরাসরি উত্তর দিই, আর দাম, ফোরকাস্ট, বাজার তুলনা বা ঠিক দাম যাচাই দরকার হলে ডাটা ব্যবহার করি। কী জানতে চান?",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    const historyForApi = useMemo(
        () => messages
            .filter(m => m.role === "user" || m.role === "assistant")
            .slice(-8)
            .map(({ role, content }) => ({ role, content })),
        [messages]
    );

    async function send(text = input) {
        const clean = text.trim();
        if (!clean || loading) return;

        const userMsg = { role: "user", content: clean };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await postAgentChat(clean, historyForApi);
            const payload = res.data || {};
            const tools = (payload.tool_results || []).map(t => t.tool).filter(Boolean);
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: payload.answer || "দুঃখিত, আমি উত্তর তৈরি করতে পারিনি।",
                    tools,
                },
            ]);
        } catch (err) {
            const msg = err?.response?.data?.detail || err?.message || "অজানা সমস্যা";
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: `AI উত্তর দিতে পারেনি: ${msg}\n\nসার্ভার চালু আছে কি না এবং GROQ_API_KEY .env-এ ঠিক আছে কি না চেক করুন।`,
                },
            ]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 20,
        }}>
            <section style={{
                borderRadius: 26,
                padding: "26px 24px",
                background:
                    "radial-gradient(circle at top left, rgba(16,185,129,0.20), transparent 35%), linear-gradient(135deg, #052e25, #064e3b 58%, #065f46)",
                color: "white",
                boxShadow: "0 20px 50px rgba(6, 78, 59, 0.25)",
                overflow: "hidden",
                position: "relative",
            }}>
                <div style={{
                    position: "absolute",
                    right: -50,
                    top: -60,
                    width: 180,
                    height: 180,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.10)",
                }} />
                <div style={{ position: "relative" }}>
                    <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 12px",
                        border: "1px solid rgba(255,255,255,0.18)",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.10)",
                        fontSize: 13,
                        fontWeight: 700,
                        marginBottom: 14,
                    }}>
                        🧠 AI বাজার সহকারী
                    </div>
                    <h1 style={{ margin: 0, fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: -1 }}>
                        একবার জিজ্ঞেস করুন, AI ঠিক ডাটা দেখে উত্তর দেবে।
                    </h1>
                    <p style={{ maxWidth: 740, margin: "12px 0 0", color: "rgba(255,255,255,0.82)", lineHeight: 1.7 }}>
                        দাম ফোরকাস্ট, ঠিক দাম যাচাই, বাজার তুলনা আর বাজার লিস্ট — সব এক জায়গায় বাংলায় জিজ্ঞেস করতে পারবেন।
                    </p>
                </div>
            </section>

            <section style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 14,
                minHeight: 540,
            }}>
                <div style={{
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    borderRadius: 24,
                    padding: 16,
                }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {QUICK_PROMPTS.map(q => (
                            <button
                                key={q}
                                onClick={() => send(q)}
                                disabled={loading}
                                style={{
                                    border: "1px solid #d1fae5",
                                    background: "#ffffff",
                                    color: "#065f46",
                                    borderRadius: 999,
                                    padding: "9px 12px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    fontWeight: 700,
                                    boxShadow: "0 6px 16px rgba(15,23,42,0.05)",
                                }}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{
                    background: "linear-gradient(180deg, #f8fafc, #eef2f7)",
                    borderRadius: 26,
                    border: "1px solid #e5e7eb",
                    padding: 18,
                    minHeight: 420,
                    maxHeight: 560,
                    overflowY: "auto",
                }}>
                    {messages.map((m, idx) => <MessageCard key={idx} message={m} />)}
                    {loading && (
                        <div style={{ color: "#64748b", fontWeight: 700, padding: "4px 8px" }}>
                            AI প্রয়োজনীয় ডাটা দেখছে…
                        </div>
                    )}
                </div>

                <form
                    onSubmit={(e) => { e.preventDefault(); send(); }}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 12,
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 22,
                        padding: 12,
                        boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
                    }}
                >
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        placeholder="যেমন: আমি ৮০ টাকায় পেঁয়াজ কিনেছি, এটা কি ঠিক দাম?"
                        rows={2}
                        style={{
                            border: "none",
                            outline: "none",
                            resize: "none",
                            font: "inherit",
                            lineHeight: 1.5,
                            padding: "8px 10px",
                        }}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        style={{
                            alignSelf: "stretch",
                            border: "none",
                            borderRadius: 16,
                            padding: "0 20px",
                            background: loading || !input.trim()
                                ? "#cbd5e1"
                                : "linear-gradient(135deg, #059669, #10b981)",
                            color: "white",
                            fontWeight: 900,
                            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                        }}
                    >
                        পাঠান
                    </button>
                </form>
            </section>
        </div>
    );
}
