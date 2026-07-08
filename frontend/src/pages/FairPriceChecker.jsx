import { useEffect, useMemo, useState } from "react";
import { getPricesToday } from "../api/client";
import ProductSelector from "../components/ProductSelector";
import useSessionState from "../hooks/useSessionState";
import { DIVISIONS, marketLabel } from "../data/marketRegions";
import {
    getProductImage,
    formatProductName,
} from "../utils/productAssets";
import { bnTk } from "../utils/banglaFormat";

function normalizeRows(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
}

function getScopeLabel(divisionId, marketKey, selectedDivision) {
    if (marketKey !== "all") {
        return marketLabel(marketKey);
    }

    if (divisionId !== "all") {
        return `${selectedDivision?.name || ""} বিভাগের সব বাজার`;
    }

    return "সব বাজার";
}

function getFilteredRows(rows, product, divisionId, marketKey, selectedDivision) {
    let filtered = rows.filter((row) => row?.standard_key === product);

    if (marketKey !== "all") {
        filtered = filtered.filter((row) => row.market === marketKey);
        return filtered;
    }

    if (divisionId !== "all") {
        const divisionMarkets = new Set(
            (selectedDivision?.markets || []).map((market) => market.key)
        );

        filtered = filtered.filter((row) => divisionMarkets.has(row.market));
    }

    return filtered;
}

function getOtherMarketRows(rows, product, marketKey) {
    return rows.filter(
        (row) =>
            row?.standard_key === product &&
            row?.market &&
            row.market !== marketKey
    );
}

function getPriceStats(filtered) {
    if (!filtered || filtered.length === 0) return null;

    const minValues = filtered
        .map((row) => Number(row.min_price ?? row.avg_price))
        .filter((value) => Number.isFinite(value) && value > 0);

    const maxValues = filtered
        .map((row) => Number(row.max_price ?? row.avg_price))
        .filter((value) => Number.isFinite(value) && value > 0);

    const avgValues = filtered
        .map((row) => Number(row.avg_price))
        .filter((value) => Number.isFinite(value) && value > 0);

    if (minValues.length === 0 || maxValues.length === 0) {
        return null;
    }

    const officialMin = Math.min(...minValues);
    const officialMax = Math.max(...maxValues);
    const officialAvg =
        avgValues.length > 0
            ? avgValues.reduce((sum, value) => sum + value, 0) / avgValues.length
            : (officialMin + officialMax) / 2;

    return {
        official_min: Number(officialMin.toFixed(2)),
        official_max: Number(officialMax.toFixed(2)),
        official_avg: Number(officialAvg.toFixed(2)),
        market_count: new Set(filtered.map((row) => row.market).filter(Boolean)).size,
    };
}

function buildResultObject({
    product,
    paidNumber,
    stats,
    scopeLabel,
    requestedScopeLabel = null,
    isFallback = false,
}) {
    let color = "green";
    let verdict = "within_range";

    if (paidNumber > stats.official_max) {
        color = "red";
        verdict = "above_range";
    } else if (paidNumber < stats.official_min) {
        color = "green";
        verdict = "below_range";
    }

    return {
        product,
        paid: paidNumber,
        official_min: stats.official_min,
        official_max: stats.official_max,
        official_avg: stats.official_avg,
        market_count: stats.market_count,
        color,
        verdict,
        scope_label: scopeLabel,
        requested_scope_label: requestedScopeLabel,
        is_fallback: isFallback,
    };
}

function buildFairResult(rows, product, paid, divisionId, marketKey, selectedDivision) {
    const paidNumber = Number(paid);

    if (!product || !Number.isFinite(paidNumber) || paidNumber <= 0) {
        return null;
    }

    const requestedScopeLabel = getScopeLabel(
        divisionId,
        marketKey,
        selectedDivision
    );

    const filtered = getFilteredRows(
        rows,
        product,
        divisionId,
        marketKey,
        selectedDivision
    );

    const requestedStats = getPriceStats(filtered);

    if (requestedStats) {
        return buildResultObject({
            product,
            paidNumber,
            stats: requestedStats,
            scopeLabel: requestedScopeLabel,
            isFallback: false,
        });
    }

    // If user selected a specific market but product/price is missing there,
    // fallback to other available markets for the same product.
    if (marketKey !== "all") {
        const otherMarketRows = getOtherMarketRows(rows, product, marketKey);
        const fallbackStats = getPriceStats(otherMarketRows);

        if (fallbackStats) {
            return buildResultObject({
                product,
                paidNumber,
                stats: fallbackStats,
                scopeLabel: "অন্যান্য বাজারের দাম",
                requestedScopeLabel,
                isFallback: true,
            });
        }
    }

    return null;
}

function getFairResultText(result) {
    if (!result) {
        return {
            title: "ফলাফল পাওয়া যায়নি",
            message: "আবার চেষ্টা করুন।",
        };
    }

    const paid = bnTk(result.paid, 2);
    const min = bnTk(result.official_min, 2);
    const max = bnTk(result.official_max, 2);
    const avg = bnTk(result.official_avg, 2);
    const scope = result.scope_label || "বাজার";

    const fallbackMessage = result.is_fallback
        ? `আজ এই পণ্যটি ${result.requested_scope_label}-এ পাওয়া যায়নি। তাই ${scope}-এর তথ্য ব্যবহার করে হিসাব করা হয়েছে। `
        : "";

    if (result.verdict === "below_range") {
        return {
            title: "দাম কম বা ভালো ডিল মনে হচ্ছে",
            message: `${fallbackMessage}আপনি ${paid} দিয়েছেন। ${scope}-এ এই পণ্যের দাম ${avg}, আর সাধারণ দাম ${min} থেকে ${max}। তাই দামটা বাজার দামের চেয়ে কম বা ভালো হতে পারে।`,
        };
    }

    if (result.verdict === "above_range") {
        return {
            title: "দাম বেশি মনে হচ্ছে",
            message: `${fallbackMessage}আপনি ${paid} দিয়েছেন। ${scope}-এ এই পণ্যের দাম ${avg}, আর সাধারণ দাম ${min} থেকে ${max}। তাই এই দামটা বেশি হতে পারে।`,
        };
    }

    return {
        title: "ঠিক দামের মধ্যে আছে",
        message: `${fallbackMessage}আপনি ${paid} দিয়েছেন। ${scope}-এ এই পণ্যের দাম ${avg}, আর সাধারণ দাম ${min} থেকে ${max}। তাই দামটা ঠিক আছে।`,
    };
}

export default function FairPriceChecker() {
    const [product, setProduct] = useSessionState("fair_product", "");
    const [paid, setPaid] = useSessionState("fair_paid_price", "");
    const [divisionId, setDivisionId] = useSessionState("fair_division_id", "all");
    const [marketKey, setMarketKey] = useSessionState("fair_market_key", "all");
    const [result, setResult] = useSessionState("fair_result", null);

    const [priceRows, setPriceRows] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const selectedDivision = useMemo(() => {
        return DIVISIONS.find((division) => division.id === divisionId);
    }, [divisionId]);

    const marketsForDivision = useMemo(() => {
        if (divisionId === "all") return [];
        return selectedDivision?.markets || [];
    }, [divisionId, selectedDivision]);

    useEffect(() => {
        let alive = true;

        setDataLoading(true);

        getPricesToday()
            .then((res) => {
                if (!alive) return;
                setPriceRows(normalizeRows(res.data));
            })
            .catch((err) => {
                console.error("Fair price data load failed:", err);
                if (alive) {
                    setError("দামের তথ্য আনতে একটু সময় লাগছে। কিছুক্ষণ পর আবার চেষ্টা করুন।");
                }
            })
            .finally(() => {
                if (alive) setDataLoading(false);
            });

        return () => {
            alive = false;
        };
    }, []);

    const resetResult = () => {
        setResult(null);
        setError(null);
    };

    const handleProductChange = (value) => {
        setProduct(value);
        resetResult();
    };

    const handlePaidChange = (value) => {
        setPaid(value);
        resetResult();
    };

    const handleDivisionChange = (value) => {
        setDivisionId(value);
        setMarketKey("all");
        resetResult();
    };

    const handleMarketChange = (value) => {
        setMarketKey(value);
        resetResult();
    };

    const check = async () => {
        if (!product || !paid) return;

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            let rows = priceRows;

            if (rows.length === 0) {
                const res = await getPricesToday({ force: true });
                rows = normalizeRows(res.data);
                setPriceRows(rows);
            }

            const fairResult = buildFairResult(
                rows,
                product,
                paid,
                divisionId,
                marketKey,
                selectedDivision
            );

            if (!fairResult) {
                const scope = getScopeLabel(divisionId, marketKey, selectedDivision);

                if (marketKey !== "all") {
                    setError(
                        `আজ এই পণ্যটি ${scope}-এ পাওয়া যায়নি এবং অন্য বাজারেও পর্যাপ্ত তথ্য পাওয়া যায়নি। অন্য পণ্য বা সব বাজার দিয়ে চেষ্টা করুন।`
                    );
                } else {
                    setError(
                        `আজ এই পণ্যটির জন্য ${scope}-এ পর্যাপ্ত দামের তথ্য পাওয়া যায়নি। অন্য বিভাগ বা বাজার দিয়ে চেষ্টা করুন।`
                    );
                }

                return;
            }

            setResult(fairResult);
        } catch (err) {
            console.error("Fair price check failed:", err);
            setError("এই মুহূর্তে দাম চেক করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।");
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
    const currentScope = getScopeLabel(divisionId, marketKey, selectedDivision);

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

                            <ProductSelector value={product} onChange={handleProductChange} />
                        </label>

                        <label style={{ display: "grid", gap: 8 }}>
                            <span
                                style={{
                                    fontSize: 18,
                                    fontWeight: 900,
                                    color: "var(--hero-heading)",
                                }}
                            >
                                বিভাগ
                            </span>

                            <select
                                className="mm-select"
                                value={divisionId}
                                onChange={(e) => handleDivisionChange(e.target.value)}
                            >
                                <option value="all">সব বিভাগ</option>

                                {DIVISIONS.map((division) => (
                                    <option key={division.id} value={division.id}>
                                        {division.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label style={{ display: "grid", gap: 8 }}>
                            <span
                                style={{
                                    fontSize: 18,
                                    fontWeight: 900,
                                    color: "var(--hero-heading)",
                                }}
                            >
                                বাজার
                            </span>

                            <select
                                className="mm-select"
                                value={marketKey}
                                onChange={(e) => handleMarketChange(e.target.value)}
                                disabled={divisionId === "all"}
                            >
                                <option value="all">
                                    {divisionId === "all"
                                        ? "সব বাজার"
                                        : "এই বিভাগের সব বাজার"}
                                </option>

                                {marketsForDivision.map((market) => (
                                    <option key={market.key} value={market.key}>
                                        {market.label}
                                    </option>
                                ))}
                            </select>
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

                            <input
                                className="mm-input"
                                type="number"
                                inputMode="decimal"
                                placeholder="যেমন: ১৯৫"
                                value={paid}
                                onChange={(e) => handlePaidChange(e.target.value)}
                                style={{
                                    borderColor: "var(--hero-price)",
                                    borderRadius: 14,
                                    fontSize: 16,
                                }}
                            />
                        </label>

                        <button
                            onClick={check}
                            disabled={loading || dataLoading || !product || !paid}
                            style={{
                                border: "none",
                                borderRadius: 999,
                                padding: "16px 22px",
                                background:
                                    loading || dataLoading || !product || !paid
                                        ? "var(--gray-200)"
                                        : "linear-gradient(135deg, var(--hero-primary), var(--hero-primary-hover))",
                                color:
                                    loading || dataLoading || !product || !paid
                                        ? "var(--gray-400)"
                                        : "white",
                                fontWeight: 900,
                                fontSize: 17,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor:
                                    loading || dataLoading || !product || !paid
                                        ? "not-allowed"
                                        : "pointer",
                                transition: "all 0.15s ease",
                                boxShadow:
                                    loading || dataLoading || !product || !paid
                                        ? "none"
                                        : "0 14px 28px rgba(93, 163, 61, 0.28)",
                            }}
                        >
                            <span
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    margin: "0 auto",
                                }}
                            >
                                {dataLoading
                                    ? "ডাটা লোড হচ্ছে…"
                                    : loading
                                        ? "চেক হচ্ছে…"
                                        : "দাম চেক করুন"}
                                {!loading && !dataLoading && <span>→</span>}
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
                                    background:
                                        "linear-gradient(135deg, #ffffff, var(--hero-bg-soft))",
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
                                        height: "auto",
                                        objectFit: "contain",
                                        filter:
                                            "drop-shadow(0 18px 22px rgba(47,93,40,0.16))",
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

                                <p className="section-note">দেখা হচ্ছে: {currentScope}</p>
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
                        maxWidth: 720,
                    }}
                >
                    {error}
                </div>
            )}

            {result && fairText && (
                <div
                    style={{
                        marginTop: 22,
                        background: bgMap[result.color] || "var(--gray-50)",
                        border:
                            "1px solid " +
                            (borderMap[result.color] || "var(--gray-200)"),
                        borderRadius: 24,
                        padding: "24px 26px",
                    }}
                >
                    {result.is_fallback && (
                        <div
                            style={{
                                marginBottom: 16,
                                padding: "12px 14px",
                                borderRadius: 16,
                                background: "#fff7ed",
                                border: "1px solid #fed7aa",
                                color: "#9a3412",
                                fontSize: 15.5,
                                fontWeight: 800,
                                lineHeight: 1.6,
                            }}
                        >
                            আজ এই পণ্যটি {result.requested_scope_label}-এ পাওয়া যায়নি।
                            তাই অন্যান্য বাজারের দামের ভিত্তিতে ফলাফল দেখানো হচ্ছে।
                        </div>
                    )}

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
                                background:
                                    iconBgMap[result.color] || "var(--gray-400)",
                                color: "white",
                                display: "grid",
                                placeItems: "center",
                                fontSize: 18,
                                flexShrink: 0,
                            }}
                        >
                            {result.color === "red" ? "✕" : "✓"}
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
                            borderTop:
                                "1px solid " +
                                (borderMap[result.color] || "var(--gray-200)"),
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: 15.5,
                                    color: "var(--hero-text-light)",
                                    fontWeight: 700,
                                }}
                            >
                                আপনি দিয়েছেন
                            </div>

                            <div
                                style={{
                                    fontSize: 20,
                                    fontWeight: 850,
                                    color: "var(--gray-700)",
                                }}
                            >
                                {bnTk(result.paid, 2)}
                            </div>
                        </div>

                        <div
                            style={{
                                width: 1,
                                alignSelf: "stretch",
                                background:
                                    borderMap[result.color] || "var(--gray-200)",
                            }}
                        />

                        <div>
                            <div
                                style={{
                                    fontSize: 15.5,
                                    color: "var(--hero-text-light)",
                                    fontWeight: 900,
                                }}
                            >
                                বাজার দামের সীমা
                            </div>

                            <div
                                style={{
                                    fontSize: 20,
                                    fontWeight: 850,
                                    color: "var(--gray-700)",
                                }}
                            >
                                {bnTk(result.official_min, 2)} -{" "}
                                {bnTk(result.official_max, 2)}
                            </div>
                        </div>

                        <div>
                            <div
                                style={{
                                    fontSize: 15.5,
                                    color: "var(--hero-text-light)",
                                    fontWeight: 900,
                                }}
                            >
                                গড় দাম
                            </div>

                            <div
                                style={{
                                    fontSize: 20,
                                    fontWeight: 850,
                                    color: "var(--gray-700)",
                                }}
                            >
                                {bnTk(result.official_avg, 2)}
                            </div>
                        </div>

                        <div>
                            <div
                                style={{
                                    fontSize: 15.5,
                                    color: "var(--hero-text-light)",
                                    fontWeight: 900,
                                }}
                            >
                                হিসাব করা হয়েছে
                            </div>

                            <div
                                style={{
                                    fontSize: 20,
                                    fontWeight: 850,
                                    color: "var(--gray-700)",
                                }}
                            >
                                {result.scope_label}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}