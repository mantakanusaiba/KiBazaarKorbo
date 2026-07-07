import { formatUnit, getCategoryMeta, getProductCategory, getProductImage } from "../utils/productAssets";
import { bnTk } from "../utils/banglaFormat";

export default function PriceCard({
    productKey,
    product,
    market,
    min,
    max,
    avg,
    unit,
    onClick,
}) {
    const categoryId = getProductCategory(productKey);
    const category = getCategoryMeta(categoryId);
    const image = getProductImage(productKey);

    return (
        <article className="price-card" onClick={onClick}>
            <div className="price-image-wrap">
                <img src={image} alt={product} className="price-card-img" />

                <div className="live-dot-badge">
                    <span className="live-dot" />
                    লাইভ
                </div>

                <div className="price-category-badge">
                    <span>{category.icon}</span>
                    {category.label}
                </div>
            </div>

            <div className="price-card-body">
                <div>
                    <h3 className="price-card-title">{product}</h3>

                    {market && (
                        <p className="price-card-market">
                            📍 {market}
                        </p>
                    )}
                </div>

                <div className="price-main-row">
                    <div>
                        <div className="price-main">
                            {bnTk(avg, 0)}
                            <span>/{formatUnit(unit || "kg")}</span>
                        </div>

                        <div className="price-live-text">
                            <span className="mini-live-dot" />
                            
                        </div>
                    </div>
                </div>

                <div className="price-range-row">
                    <div>
                        <span>সর্বনিম্ন</span>
                        <strong>{bnTk(min, 0)}</strong>
                    </div>

                    <div>
                        <span>সর্বোচ্চ</span>
                        <strong>{bnTk(max, 0)}</strong>
                    </div>
                </div>
            </div>
        </article>
    );
}