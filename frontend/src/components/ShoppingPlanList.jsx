import { bucketItems } from "../utils/basketMath";
import { formatProductName, translateApiText } from "../utils/productAssets";

export default function ShoppingPlanList({ items }) {
    const { buyToday, wait } = bucketItems(items);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {buyToday.length > 0 && (
                <Bucket title="আজ কিনুন" icon="🟢" color="var(--green-600)" bg="var(--green-50)" items={buyToday} />
            )}
            {wait.length > 0 && (
                <Bucket title="অপেক্ষা করুন" icon="🟡" color="var(--brand-700)" bg="var(--brand-50)" items={wait} />
            )}
        </div>
    );
}

function Bucket({ title, icon, color, bg, items }) {
    return (
        <div>
            <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                fontWeight: 700, fontSize: 13.5, color,
            }}>
                <span>{icon}</span>{title}
                <span style={{ fontWeight: 400, color: "var(--gray-500)", fontSize: 12 }}>
                    ({items.length})
                </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((it) => (
                    <div key={it.product} style={{
                        background: bg,
                        borderRadius: "var(--radius-sm)",
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                    }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--gray-900)" }}>
                                {formatProductName(it.product)} <span style={{ fontWeight: 400, color: "var(--gray-500)" }}>({it.qty})</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--gray-600)", marginTop: 2 }}>
                                {translateApiText(it.timing.reason)}
                            </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gray-900)", whiteSpace: "nowrap" }}>
                            ৳{it.line_total.toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
