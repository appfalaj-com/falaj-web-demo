import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import {
  getProductMetrics,
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

export default function CompanyProductsPage({ companyId }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const metrics = getProductMetrics(null, products);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const supabaseProducts = await getProductsByCompanyFromSupabase(companyId);
        if (!cancelled) setProducts(supabaseProducts);
      } catch {
        if (!cancelled) {
          setProducts([]);
          setErrorMessage("تعذر تحميل منتجات الشركة من قاعدة البيانات.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  function showProductManagementPending() {
    setMessage("سيتم تفعيل إدارة المنتجات في المرحلة التالية");
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>المنتجات والأسعار</h1>
        </div>
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
            <p>ستظهر هنا منتجات شركتكم وأسعارها بعد إضافتها.</p>
          </div>
        </div>

        {message ? <p className="auth-alert success">{message}</p> : null}

        {isLoading ? (
          <p className="empty-state">جاري تحميل المنتجات...</p>
        ) : errorMessage ? (
          <p className="empty-state">{errorMessage}</p>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <strong>لا توجد منتجات حتى الآن</strong>
            <span>ستظهر هنا منتجات شركتكم بعد إضافتها من لوحة المورد.</span>
          </div>
        ) : (
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
                    <button type="button" onClick={showProductManagementPending}>
                      تعديل
                    </button>
                    <button type="button" className="ghost" onClick={showProductManagementPending}>
                      {product.isAvailable ? "إيقاف" : "تفعيل"}
                    </button>
                    <button type="button" className="ghost danger-action" onClick={showProductManagementPending}>
                      حذف
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
