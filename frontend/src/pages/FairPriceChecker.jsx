import { useState } from "react";
import { postFairPrice } from "../api/client";
import ProductSelector from "../components/ProductSelector";
import useSessionState from "../hooks/useSessionState";
import {
    getProductImage,
    formatProductName,
} from "../utils/productAssets";
import { bnTk } from "../utils/banglaFormat";

function getFairResultText(result) {
    if (!result) {
        return {
            icon: "➖",
            title: "ফলাফল পাওয়া যায়নি",
            message: "আবার চেষ্টা করুন।",
        };
    }

    const paid = bnTk(result.paid, 2);
    const min = bnTk(result.official_min, 2);
    const max = bnTk(result.official_max, 2);

    if (result.color === "green") {
        return {
            icon: "✅",
            title: "ঠিক দামের মধ্যে আছে",
            message: `আপনি ${paid} দিয়েছেন। বাজারে এই পণ্যের স্বাভাবিক দাম ${min} থেকে ${max}। তাই দামটা ঠিক আছে।`,
        };
    }

    if (result.color === "red") {
        return {
            icon: "❌",
            title: "দাম বেশি মনে হচ্ছে",
            message: `আপনি ${paid} দিয়েছেন। বাজারে এই পণ্যের স্বাভাবিক দাম ${min} থেকে ${max}। তাই এই দামটা বেশি হতে পারে।`,
        };
    }

    return {
        icon: "➖",
        title: "দাম নিশ্চিত বলা যাচ্ছে না",
        message: `আপনি ${paid} দিয়েছেন। বাজারে এই পণ্যের স্বাভাবিক দাম ${min} থেকে ${max}। আরো বাজারের সাথে মিলিয়ে দেখা ভালো।`,
    };
}

export default function FairPriceChecker() {
    const [product, setProduct] = useSessionState("fair_product", "");
    const [paid, setPaid] = useSessionState("fair_paid_price", "");
    const [result, setResult] = useSessionState("fair_result", null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const check = async () => {
        if (!product || !paid) return;

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const res = await postFairPrice(product, parseFloat(paid));
            setResult(res.data);
        } catch {
            setError("দাম চেক করা যায়নি। সার্ভার চালু আছে কি না দেখুন।");
        } finally {
            setLoading(false);
        }
    };

    const colorMap = {
        green: "var(--hero-heading)",
        red: "var(--red-600)",
        gray: "var(--hero-text)",
    };

    const iconBgMap = {
        green: "var(--hero-primary)",
        red: "var(--red-600)",
        gray: "var(--gray-400)",
    };

    const bgMap = {
        green: "var(--hero-bg-soft)",
        red: "var(--red-50)",
        gray: "var(--gray-50)",
    };

    const borderMap = {
        green: "var(--hero-border)",
        red: "#fecaca",
        gray: "var(--gray-200)",
    };

    const fairText = result ? getFairResultText(result) : null;

    return (
        <div className="page-enter">
            <section className="page-hero" style={{ marginBottom: 30 }}>


                <h1 className="page-title">আপনি ঠিক দাম দিয়েছেন কি না দেখুন।</h1>

                <p className="page-subtitle">
                    আপনি কত টাকা দিয়েছেন লিখুন। আমরা সর্বশেষ বাজার দামের সাথে মিলিয়ে দেখাবো।
                </p>
            </section>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                    alignItems: "stretch",
                }}
            >
                <div
                    style={{
                        padding: 24,
                        borderRadius: 24,
                        background: "var(--hero-card)",
                        border: "1px solid var(--lemon-border)",
                        boxShadow: "0 12px 30px rgba(47,93,40,0.06)",
                    }}
                >
                    <div style={{ display: "grid", gap: 16 }}>
                        <label style={{ display: "grid", gap: 8 }}>
                            <span
                                style={{
                                    fontSize: 18,
                                    fontWeight: 900,
                                    color: "var(--hero-heading)",
                                }}
                            >
                                পণ্য
                            </span>

                            <ProductSelector value={product} onChange={setProduct} />
                        </label>

                        <label style={{ display: "grid", gap: 8 }}>
                            <span
                                style={{
                                    fontSize: 18,
                                    fontWeight: 900,
                                    color: "var(--hero-heading)",
                                }}
                            >
                                আপনি কত টাকা দিয়েছেন
                            </span>

                            <div style={{ position: "relative" }}>
                                <span
                                    style={{
                                        position: "absolute",
                                        left: 14,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        fontSize: 18,
                                        pointerEvents: "none",
                                    }}
                                >
                                    💵
                                </span>

                                <input
                                    className="mm-input"
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="যেমন: ১৯৫"
                                    value={paid}
                                    onChange={(e) => setPaid(e.target.value)}
                                    style={{
                                        paddingLeft: 42,
                                        borderColor: "var(--hero-price)",
                                        borderRadius: 14,
                                        fontSize: 16,
                                    }}
                                />
                            </div>
                        </label>

                        <button
                            onClick={check}
                            disabled={loading || !product || !paid}
                            style={{
                                border: "none",
                                borderRadius: 999,
                                padding: "16px 22px",
                                background: loading || !product || !paid
                                    ? "var(--gray-200)"
                                    : "linear-gradient(135deg, var(--hero-primary), var(--hero-primary-hover))",
                                color: loading || !product || !paid ? "var(--gray-400)" : "white",
                                fontWeight: 900,
                                fontSize: 17,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: loading || !product || !paid ? "not-allowed" : "pointer",
                                transition: "all 0.15s ease",
                                boxShadow:
                                    loading || !product || !paid
                                        ? "none"
                                        : "0 14px 28px rgba(93, 163, 61, 0.28)",
                            }}
                        >
                            <span style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 auto" }}>
                                {loading ? "চেক হচ্ছে…" : "দাম চেক করুন"}
                                {!loading && <span>→</span>}
                            </span>
                        </button>
                    </div>
                </div>

                <div
                    style={{
                        padding: 18,
                        borderRadius: 24,
                        background: "var(--hero-card)",
                        border: "1px solid var(--lemon-border)",
                        boxShadow: "0 12px 30px rgba(47,93,40,0.06)",
                    }}
                >
                    {product ? (
                        <>
                            <div
                                style={{
                                    minHeight: 320,
                                    height: 320,
                                    borderRadius: 20,
                                    background: "linear-gradient(135deg, #ffffff, var(--hero-bg-soft))",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    padding: 22,
                                }}
                            >
                                <img
                                    src={getProductImage(product)}
                                    alt={formatProductName(product)}
                                    style={{
                                        display: "block",
                                        maxWidth: "90%",
                                        maxHeight: "90%",
                                        width: "auto",
                                        height: "auto", objectFit: "contain",
                                        filter: "drop-shadow(0 18px 22px rgba(47,93,40,0.16))",
                                    }}
                                />
                            </div>

                            <div style={{ marginTop: 14 }}>
                                <h2
                                    className="section-title"
                                    style={{ marginTop: 6, color: "var(--hero-heading)" }}
                                >
                                    {formatProductName(product)}
                                </h2>
                            </div>
                        </>
                    ) : (
                        <div
                            style={{
                                padding: "48px 24px",
                                textAlign: "center",
                                color: "var(--hero-text-light)",
                                border: "1px dashed var(--hero-border)",
                                borderRadius: 16,
                                background: "var(--hero-bg-soft)",
                            }}
                        >
                            একটি পণ্য বাছুন, এখানে ছবি দেখা যাবে।
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div
                    className="alert-error"
                    style={{
                        marginTop: 20,
                        maxWidth: 620,
                    }}
                >
                    ⚠️ {error}
                </div>
            )}

            {result && fairText && (
                <div
                    style={{
                        marginTop: 22,
                        background: bgMap[result.color] || "var(--gray-50)",
                        border: "1px solid " + (borderMap[result.color] || "var(--gray-200)"),
                        borderRadius: 24,
                        padding: "24px 26px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            marginBottom: 10,
                        }}
                    >
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                background: iconBgMap[result.color] || "var(--gray-400)",
                                color: "white",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 18,
                                flexShrink: 0,
                            }}
                        >
                            {result.color === "green" ? "✓" : result.color === "red" ? "✕" : "–"}
                        </div>

                        <div
                            style={{
                                color: colorMap[result.color] || "var(--gray-700)",
                                fontWeight: 950,
                                fontSize: 21,
                            }}
                        >
                            {fairText.title}
                        </div>
                    </div>

                    <p
                        style={{
                            fontSize: 16.5,
                            color: "var(--hero-text)",
                            lineHeight: 1.7,
                            marginBottom: 20,
                        }}
                    >
                        {fairText.message}
                    </p>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 28,
                            flexWrap: "wrap",
                            paddingTop: 18,
                            borderTop: "1px solid " + (borderMap[result.color] || "var(--gray-200)"),
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>


                            <div>
                                <div style={{ fontSize: 15.5, color: "var(--hero-text-light)", fontWeight: 700 }}>
                                    আপনি দিয়েছেন
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 850, color: "var(--gray-700)" }}>
                                    {bnTk(result.paid, 2)}
                                </div>
                            </div>
                        </div>

                        <div
                            style={{
                                width: 1,
                                alignSelf: "stretch",
                                background: borderMap[result.color] || "var(--gray-200)",
                            }}
                        />

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

                            <div>
                                <div style={{ fontSize: 15.5, color: "var(--hero-text-light)", fontWeight: 900 }}>
                                    বাজার দামের সীমা
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 850, color: "var(--gray-700)" }}>
                                    {bnTk(result.official_min, 2)} - {bnTk(result.official_max, 2)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}