import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import { MOCK_COMPANY_ID } from "../services/companyService.js";
import {
  getProductMetrics,
  getProductsByCompany,
  getProductsByCompanyFromSupabase,
} from "../services/productService.js";

function formatPrice(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}

function availabilityLabel(isAvailable) {
  return isAvailable ? "متوفر" : "غير متوفر";
}

function categoryLabel(category) {
  const labels = {
    bottled_water: "عبوات",
    tanker: "صهاريج",
  };

  return labels[category] ?? category;
}

export default function CompanyProductsPage() {
  const [products, setProducts] = useState(() => getProductsByCompany(MOCK_COMPANY_ID));
  const [dataMode, setDataMode] = useState("mock");
  const metrics = getProductMetrics(null, products);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const supabaseProducts = await getProductsByCompanyFromSupabase(MOCK_COMPANY_ID);
        if (!cancelled && supabaseProducts.length > 0) {
          setProducts(supabaseProducts);
          setDataMode("supabase");
        }
      } catch {
        if (!cancelled) {
          setProducts(getProductsByCompany(MOCK_COMPANY_ID));
          setDataMode("mock");
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>المنتجات والأسعار</h1>
        </div>
        <span className="checkpoint">
          {dataMode === "supabase" ? "متصل بقاعدة البيانات" : "وضع تجريبي"}
        </span>
      </header>

      <section className="metrics-grid">
        <MetricCard label="إجمالي المنتجات" value={metrics.totalProducts} tone="primary" />
        <MetricCard label="المتوفر" value={metrics.availableProducts} />
        <MetricCard label="غير المتوفر" value={metrics.unavailableProducts} />
        <MetricCard label="متوسط السعر" value={formatPrice(metrics.averagePrice)} tone="cash" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>كتالوج الشركة</h2>
            <p>هذه المنتجات mock الآن، وستكون لاحقًا نفس المنتجات الظاهرة للزبون.</p>
          </div>
        </div>

        <div className="product-list">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image-wrap">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.nameAr} className="product-image" />
                ) : (
                  <div className="product-image-placeholder">فلج</div>
                )}
              </div>

              <div className="product-body">
                <div className="product-title-row">
                  <div>
                    <h3>{product.nameAr}</h3>
                    <p>{product.description}</p>
                  </div>
                  <span className={`availability ${product.isAvailable ? "available" : "unavailable"}`}>
                    {availabilityLabel(product.isAvailable)}
                  </span>
                </div>

                <dl className="product-meta">
                  <div>
                    <dt>التصنيف</dt>
                    <dd>{categoryLabel(product.category)}</dd>
                  </div>
                  <div>
                    <dt>نوع المياه</dt>
                    <dd>{product.waterType}</dd>
                  </div>
                  <div>
                    <dt>الحجم</dt>
                    <dd>{product.sizeLabel}</dd>
                  </div>
                  <div>
                    <dt>السعر</dt>
                    <dd>{formatPrice(product.price)}</dd>
                  </div>
                  <div>
                    <dt>وقت التوصيل</dt>
                    <dd>{product.deliveryEstimate}</dd>
                  </div>
                </dl>

                <div className="row-actions product-actions">
                  <button type="button">تعديل</button>
                  <button type="button" className="ghost">
                    {product.isAvailable ? "إيقاف" : "تفعيل"}
                  </button>
                  <button type="button" className="ghost danger-action">
                    حذف
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
