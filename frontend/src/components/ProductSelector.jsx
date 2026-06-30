import { useEffect, useState } from "react";
import { getProducts } from "../api/client";

export const toLabel = (key) =>
    key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

export default function ProductSelector({ value, onChange, style }) {

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProducts()
            .then((r) => {
                setProducts(r.data);
                if (r.data.length && !value) onChange(r.data[0]);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
            style={{
                padding: "9px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--gray-300)",
                fontSize: 14,
                background: "var(--surface)",
                color: "var(--gray-900)",
                minWidth: 180,
                appearance: "auto",
                cursor: "pointer",
                ...style,
            }}
        >
            {loading ? (
                <option>Loading products…</option>
            ) : (
                products.map((p) => (
                    <option key={p} value={p}>
                        {toLabel(p)}
                    </option>
                ))
            )}
        </select>
    );
}