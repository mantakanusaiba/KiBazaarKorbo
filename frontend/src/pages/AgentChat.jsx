import { useMemo, useRef, useState } from "react";
import { postAgentChat } from "../api/client";
import robotIllustration from "../agent-robot.png";

const QUICK_PROMPTS = [
    { text: "এই সপ্তাহে ইলিশ মাছ কেনা কি ভালো সময়?" },
    { text: "আমি ৮০ টাকায় পেঁয়াজ কিনেছি, আমি কি ঠকেছি?" },
    { text: "ঢাকা বিভাগে ৫০০ টাকার মধ্যে ৪ জনের জন্য বাজার তালিকা বানাও" },
    { text: "আলু কোন বাজারে সবচেয়ে কম দামে পাওয়া যাচ্ছে?" },
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
        <span >

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
                    ? "linear-gradient(135deg, var(--hero-success), var(--hero-price))"
                    : "#ffffff",
                color: isUser ? "#fff" : "var(--gray-800)",
                boxShadow: isUser
                    ? "0 10px 24px rgba(109, 182, 76, 0.28)"
                    : "0 10px 28px rgba(15, 23, 42, 0.08)",
                border: isUser ? "none" : "1px solid var(--gray-200)",
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

function RobotIllustration() {
    return (
        <div style={{ position: "relative", height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
                position: "absolute",
                width: 300,
                height: 220,
                borderRadius: "50%",
                background: "rgba(109,182,76,0.10)",
            }} />

            <div style={{
                position: "absolute",
                top: 4,
                right: 40,
                background: "var(--hero-success-bg)",
                borderRadius: "18px 18px 18px 4px",
                padding: "10px 14px",
                display: "flex",
                gap: 5,
                boxShadow: "0 8px 20px rgba(47,93,40,0.10)",
                zIndex: 1,
            }}>
                <span className="am-dot" style={{ animationDelay: "0s" }} />
                <span className="am-dot" style={{ animationDelay: "0.15s" }} />
                <span className="am-dot" style={{ animationDelay: "0.3s" }} />
            </div>

            <img
                src={robotIllustration}
                alt="AI বাজার সহকারী"
                style={{
                    position: "relative",
                    zIndex: 1,
                    maxWidth: "100%",
                    maxHeight: 220,
                    objectFit: "contain",
                }}
            />

            <style>{`
                .am-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--hero-price);
                    display: inline-block;
                    animation: dotBounce 1.2s ease-in-out infinite;
                }
                @keyframes dotBounce {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
                    30% { transform: translateY(-4px); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

export default function AgentChat() {
    const [messages, setMessages] = useState([]);
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
                    content: `AI সহকারী এখন উত্তর দিতে পারছে না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।`,
                },
            ]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }

    const hasMessages = messages.length > 0;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 20 }}>

            {/* HERO */}
            <section style={{
                borderRadius: 26,
                padding: "34px 36px",
                background: "linear-gradient(135deg, #F5FAEF 0%, #EEF7E7 35%, #F8FCF5 70%, #EAF6E1 100%)",
                boxShadow: "0 20px 50px rgba(47, 93, 40, 0.12)",
                border: "1px solid var(--lemon-border)",
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
                    background: "rgba(109,182,76,0.12)",
                }} />

                <div style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "1.25fr 1fr",
                    gap: 24,
                    alignItems: "center",
                }}>
                    <div>

                        <h1 style={{ margin: 0, fontSize: "clamp(26px, 3.6vw, 40px)", letterSpacing: -1, color: "var(--hero-heading)", lineHeight: 1.15 }}>
                            একবার জিজ্ঞেস করুন,<br />AI ঠিক ডাটা দেখে উত্তর দেবে।
                        </h1>

                        <p style={{ maxWidth: 520, margin: "14px 0 0", color: "var(--hero-text)", lineHeight: 1.7 }}>
                            দাম ফোরকাস্ট, ঠিক দাম যাচাই, বাজার তুলনা আর বাজার লিস্ট — সব এক জায়গায় বাংলায় জিজ্ঞেস করতে পারবেন।
                        </p>
                    </div>

                    <RobotIllustration />
                </div>
            </section>

            {/* QUICK PROMPTS */}
            <section style={{
                background: "#ffffff",
                border: "1px solid var(--gray-200)",
                borderRadius: 24,
                padding: 20,
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 800,
                    color: "var(--hero-heading)",
                    fontSize: 16,
                    marginBottom: 14,
                }}>
                    আপনি কী জানতে চান?
                </div>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: 12,
                }}>
                    {QUICK_PROMPTS.map((q) => (
                        <button
                            key={q.text}
                            onClick={() => send(q.text)}
                            disabled={loading}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                textAlign: "left",
                                border: "1px solid var(--hero-success)",
                                background: "var(--hero-bg-soft)",
                                color: "var(--gray-800)",
                                borderRadius: 18,
                                padding: "14px 14px",
                                cursor: loading ? "not-allowed" : "pointer",
                                fontWeight: 700,
                                fontSize: 13.5,
                                lineHeight: 1.4,
                            }}
                        >

                            {q.text}
                        </button>
                    ))}
                </div>
            </section>

            {/* CONVERSATION */}
            <section style={{
                borderRadius: 26,
                border: "1px solid var(--hero-price)",
                padding: hasMessages ? 18 : "36px 24px",
                background: hasMessages
                    ? "linear-gradient(180deg, var(--gray-50), #eef2f7)"
                    : "#ffffff",
                position: "relative",
                overflow: "hidden",
            }}>
                {!hasMessages && (
                    <div style={{ position: "relative", textAlign: "center", padding: "10px 0 28px" }}>


                        <div style={{ fontSize: 22, fontWeight: 900, color: "var(--hero-success)" }}>
                            আমি আপনার AI বাজার সহকারী
                        </div>
                        <p style={{ color: "var(--gray-500)", marginTop: 8, fontSize: 15 }}>
                            আপনার যেকোনো প্রশ্ন করুন, বাজারের সঠিক তথ্য পেতে আমি সাহায্য করব।
                        </p>
                    </div>
                )}

                {hasMessages && (
                    <div style={{ minHeight: 300, maxHeight: 480, overflowY: "auto", marginBottom: 14, padding: "4px 4px 0" }}>
                        {messages.map((m, idx) => <MessageCard key={idx} message={m} />)}
                        {loading && (
                            <div style={{ color: "var(--gray-500)", fontWeight: 700, padding: "4px 8px" }}>
                                AI প্রয়োজনীয় ডাটা দেখছে…
                            </div>
                        )}
                    </div>
                )}

                <form
                    onSubmit={(e) => { e.preventDefault(); send(); }}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        maxWidth: 1500,
                        margin: "0 auto",
                        background: "#ffffff",
                        border: "1px solid var(--hero-price)",
                        borderRadius: 999,
                        padding: "10px 10px 10px 22px",
                        boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
                    }}
                >
                    <span style={{ fontSize: 16, opacity: 0.5, flexShrink: 0 }}>➤</span>

                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        placeholder="যেমন: আমি ৮০ টাকায় পেঁয়াজ কিনেছি, এটা কি ঠিক দাম?"
                        style={{
                            flex: 1,
                            border: "none",
                            outline: "none",
                            font: "inherit",
                            fontSize: 14.5,
                            padding: "10px 4px",
                            background: "transparent",
                            minWidth: 0,
                        }}
                    />

                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        style={{
                            border: "none",
                            borderRadius: 999,
                            padding: "0 26px",
                            height: 44,
                            fontSize: 14.5,
                            background: loading || !input.trim()
                                ? "var(--gray-300)"
                                : "linear-gradient(135deg, var(--hero-heading), var(--hero-primary))",
                            color: "white",
                            fontWeight: 900,
                            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        পাঠান
                    </button>
                </form>
            </section>
        </div>
    );
}