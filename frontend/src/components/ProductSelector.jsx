import { useEffect, useState } from "react";
import { getProducts } from "../api/client";
import { formatProductName } from "../utils/productAssets";

export const toLabel = formatProductName;

export default function ProductSelector({ value, onChange, style }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProducts()
            .then((r) => {
                const list = [...(r.data || [])].sort((a, b) =>
                    formatProductName(a).localeCompare(formatProductName(b), "bn")
                );
                setProducts(list);
                if (list.length && !value) onChange(list[0]);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <select
            className="mm-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
            style={style}
        >
            {loading ? (
                <option>পণ্য লোড হচ্ছে…</option>
            ) : (
                products.map((p) => (
                    <option key={p} value={p}>{formatProductName(p)}</option>
                ))
            )}
        </select>
    );
}
