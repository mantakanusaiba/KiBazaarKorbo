import { useState } from "react";
import { postFairPrice } from "../api/client";
import ProductSelector from "../components/ProductSelector";
import useSessionState from "../hooks/useSessionState";
import {
    getCategoryMeta,
    getProductCategory,
    getProductImage,
    formatProductName,
} from "../utils/productAssets";
import { bnTk } from "../utils/banglaFormat";

function getFairResultText(result) {
    if (!result) {
        return {
            icon: "➖",
            title: "ফলাফল পাওয়া যায়নি",
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
            message: `আপনি ${paid} দিয়েছেন। বাজারে এই পণ্যের স্বাভাবিক দাম ${min} থেকে ${max}। তাই দামটা ঠিক আছে।`,
        };
    }

    if (result.color === "red") {
        return {
            icon: "❌",
            title: "দাম বেশি মনে হচ্ছে",
            message: `আপনি ${paid} দিয়েছেন। বাজারে এই পণ্যের স্বাভাবিক দাম ${min} থেকে ${max}। তাই এই দামটা বেশি হতে পারে।`,
        };
    }

    return {
        icon: "➖",
        title: "দাম নিশ্চিত বলা যাচ্ছে না",
        message: `আপনি ${paid} দিয়েছেন। বাজারে এই পণ্যের স্বাভাবিক দাম ${min} থেকে ${max}। আরো বাজারের সাথে মিলিয়ে দেখা ভালো।`,
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
            setError("দাম চেক করা যায়নি। সার্ভার চালু আছে কি না দেখুন।");
        } finally {
            setLoading(false);
        }
    };

    const colorMap = {
        green: "var(--brand-700)",
        red: "var(--red-600)",
        gray: "var(--gray-500)",
    };

    const bgMap = {
        green: "var(--brand-50)",
        red: "var(--red-50)",
        gray: "var(--gray-50)",
    };

    const borderMap = {
        green: "var(--brand-100)",
        red: "#fecaca",
        gray: "var(--gray-200)",
    };

    const meta = product ? getCategoryMeta(getProductCategory(product)) : null;
    const fairText = result ? getFairResultText(result) : null;

    return (
        <div className="page-enter">
            <section className="page-hero" style={{ marginBottom: 20 }}>
                <div className="hero-kicker">⚖️ ঠিক দাম যাচাই</div>

                <h1 className="page-title">আপনি ঠিক দাম দিয়েছেন কি না দেখুন।</h1>

                <p className="page-subtitle">
                    আপনি কত টাকা দিয়েছেন লিখুন। আমরা সর্বশেষ বাজার দামের সাথে মিলিয়ে দেখাবো।
                </p>
            </section>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 440px) minmax(260px, 1fr)",
                    gap: 20,
                    alignItems: "start",
                }}
            >
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: "grid", gap: 14 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 900,
                                    color: "var(--gray-700)",
                                }}
                            >
                                পণ্য
                            </span>

                            <ProductSelector value={product} onChange={setProduct} />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 900,
                                    color: "var(--gray-700)",
                                }}
                            >
                                আপনি কত টাকা দিয়েছেন
                            </span>

                            <input
                                className="mm-input"
                                type="number"
                                inputMode="decimal"
                                placeholder="যেমন: ১৯৫"
                                value={paid}
                                onChange={(e) => setPaid(e.target.value)}
                            />
                        </label>

                        <button
                            onClick={check}
                            disabled={loading || !product || !paid}
                            className="mm-btn"
                        >
                            {loading ? "চেক হচ্ছে…" : "⚖️ দাম চেক করুন"}
                        </button>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 18 }}>
                    {product ? (
                        <>
                            <div
                                style={{
                                    minHeight: 320,
                                    height: 320,
                                    borderRadius: 24,
                                    background: "linear-gradient(135deg, white, var(--brand-50))",
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
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                        width: "auto",
                                        height: "auto",
                                        objectFit: "contain",
                                        filter: "drop-shadow(0 18px 22px rgba(15,23,42,0.14))",
                                    }}
                                />
                            </div>

                            <div style={{ marginTop: 14 }}>
                                {meta && (
                                    <div className="product-category">
                                        {meta.icon} {meta.label}
                                    </div>
                                )}

                                <h2 className="section-title" style={{ marginTop: 4 }}>
                                    {formatProductName(product)}
                                </h2>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
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
                    className="glass-card"
                    style={{
                        marginTop: 22,
                        background: bgMap[result.color] || "var(--gray-50)",
                        border: "2px solid " + (borderMap[result.color] || "var(--gray-200)"),
                        padding: "22px 24px",
                        maxWidth: 720,
                    }}
                >
                    <div
                        style={{
                            color: colorMap[result.color] || "var(--gray-700)",
                            fontWeight: 950,
                            fontSize: 20,
                            marginBottom: 8,
                        }}
                    >
                        {fairText.icon} {fairText.title}
                    </div>

                    <p
                        style={{
                            fontSize: 14,
                            color: "var(--gray-700)",
                            lineHeight: 1.7,
                            marginBottom: 14,
                        }}
                    >
                        {fairText.message}
                    </p>

                    <div
                        style={{
                            display: "flex",
                            gap: 16,
                            flexWrap: "wrap",
                            fontSize: 13,
                            color: "var(--gray-600)",
                            borderTop: "1px solid rgba(148,163,184,0.35)",
                            paddingTop: 12,
                        }}
                    >
                        <span>
                            আপনি দিয়েছেন:{" "}
                            <strong style={{ color: "var(--gray-900)" }}>
                                {bnTk(result.paid, 2)}
                            </strong>
                        </span>

                        <span>
                            বাজার দামের সীমা:{" "}
                            <strong style={{ color: "var(--gray-900)" }}>
                                {bnTk(result.official_min, 2)} – {bnTk(result.official_max, 2)}
                            </strong>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}