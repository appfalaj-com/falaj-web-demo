import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import {
  createCompanyProductForReview,
  getProductMetrics,
  getProductsByCompanyFromSupabase,
} from "../services/productService.js";

const initialProductForm = {
  nameAr: "",
  nameEn: "",
  category: "bottled_water",
  waterType: "",
  sizeLabel: "",
  volumeLiters: "",
  price: "",
  imageUrl: "",
  description: "",
  deliveryEstimate: "",
  isAvailable: true,
};

function formatPrice(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}

function availabilityLabel(isAvailable) {
  return isAvailable ? "متوفر" : "غير متوفر";
}

function categoryLabel(category) {
  const labels = {
    bottled_water: "مياه شرب عبوات",
    cartons: "كراتين مياه",
    tanker: "صهاريج مياه",
    scheduled_delivery: "توصيل مجدول",
  };

  return labels[category] ?? category;
}

function approvalStatusLabel(status) {
  const labels = {
    pending_review: "بانتظار المراجعة",
    approved: "معتمد",
    rejected: "مرفوض",
    hidden: "مخفي",
  };

  return labels[status] ?? "بانتظار المراجعة";
}

function statusTone(status) {
  if (status === "approved") return "available";
  if (status === "rejected" || status === "hidden") return "unavailable";
  return "pending";
}

export default function CompanyProductsPage({ companyId }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(initialProductForm);
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

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validateForm() {
    if (!companyId) return "تعذر تحديد الشركة الحالية.";
    if (!form.nameAr.trim()) return "يرجى إدخال اسم المنتج بالعربي.";
    if (!form.category.trim()) return "يرجى اختيار التصنيف.";
    if (!form.waterType.trim()) return "يرجى إدخال نوع المياه.";

    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return "يرجى إدخال سعر صحيح.";

    if (form.volumeLiters) {
      const volume = Number(form.volumeLiters);
      if (!Number.isFinite(volume) || volume <= 0) return "يرجى إدخال حجم صحيح باللتر.";
    }

    return "";
  }

  async function handleCreateProduct(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const createdProduct = await createCompanyProductForReview(companyId, {
        ...form,
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        category: form.category.trim(),
        waterType: form.waterType.trim(),
        sizeLabel: form.sizeLabel.trim(),
        volumeLiters: form.volumeLiters,
        price: form.price,
        imageUrl: form.imageUrl.trim(),
        description: form.description.trim(),
        deliveryEstimate: form.deliveryEstimate.trim(),
      });

      setProducts((current) => [createdProduct, ...current]);
      setForm(initialProductForm);
      setIsFormOpen(false);
      setMessage("تم إرسال المنتج للمراجعة. سيظهر للعملاء بعد موافقة إدارة فلج.");
    } catch (error) {
      console.error("Create product failed:", error);
      setErrorMessage(error?.message || "تعذر حفظ المنتج في قاعدة البيانات.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>المنتجات والأسعار</h1>
        </div>
        <button type="button" className="primary-action" onClick={() => setIsFormOpen((value) => !value)}>
          {isFormOpen ? "إغلاق النموذج" : "إضافة منتج"}
        </button>
      </header>

      <section className="metrics-grid">
        <MetricCard label="إجمالي المنتجات" value={metrics.totalProducts} tone="primary" />
        <MetricCard label="المتوفر" value={metrics.availableProducts} />
        <MetricCard label="غير المتوفر" value={metrics.unavailableProducts} />
        <MetricCard label="متوسط السعر" value={formatPrice(metrics.averagePrice)} tone="cash" />
      </section>

      {isFormOpen ? (
        <section className="panel product-form-panel">
          <div className="panel-header">
            <div>
              <h2>إضافة منتج للمراجعة</h2>
              <p>سيتم حفظ المنتج كمسودة بانتظار مراجعة إدارة فلج قبل ظهوره للعملاء.</p>
            </div>
          </div>

          <form className="product-form" onSubmit={handleCreateProduct}>
            <label>
              الاسم بالعربي
              <input value={form.nameAr} onChange={(event) => updateForm("nameAr", event.target.value)} required />
            </label>

            <label>
              الاسم بالإنجليزي
              <input value={form.nameEn} onChange={(event) => updateForm("nameEn", event.target.value)} />
            </label>

            <label>
              التصنيف
              <select value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                <option value="bottled_water">مياه شرب عبوات</option>
                <option value="cartons">كراتين مياه</option>
                <option value="tanker">صهاريج مياه</option>
                <option value="scheduled_delivery">توصيل مجدول</option>
              </select>
            </label>

            <label>
              نوع المياه
              <input value={form.waterType} onChange={(event) => updateForm("waterType", event.target.value)} required />
            </label>

            <label>
              الحجم
              <input value={form.sizeLabel} onChange={(event) => updateForm("sizeLabel", event.target.value)} />
            </label>

            <label>
              الحجم باللتر
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.volumeLiters}
                onChange={(event) => updateForm("volumeLiters", event.target.value)}
              />
            </label>

            <label>
              السعر
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.price}
                onChange={(event) => updateForm("price", event.target.value)}
                required
              />
            </label>

            <label>
              رابط الصورة
              <input
                type="url"
                value={form.imageUrl}
                onChange={(event) => updateForm("imageUrl", event.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </label>

            <label>
              مدة التوصيل
              <input
                value={form.deliveryEstimate}
                onChange={(event) => updateForm("deliveryEstimate", event.target.value)}
                placeholder="مثال: خلال ساعتين"
              />
            </label>

            <label className="product-form-wide">
              الوصف
              <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} rows={4} />
            </label>

            <label className="product-form-check">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(event) => updateForm("isAvailable", event.target.checked)}
              />
              متوفر؟
            </label>

            <div className="product-form-actions">
              <button type="submit" className="primary-action" disabled={isSaving}>
                {isSaving ? "جاري الحفظ..." : "حفظ وإرسال للمراجعة"}
              </button>
              <button type="button" className="ghost" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                إلغاء
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>كتالوج الشركة</h2>
            <p>تظهر هنا منتجات شركتكم وحالة مراجعة كل منتج من إدارة فلج.</p>
          </div>
        </div>

        {message ? <p className="auth-alert success">{message}</p> : null}
        {errorMessage ? <p className="auth-alert">{errorMessage}</p> : null}

        {isLoading ? (
          <p className="empty-state">جاري تحميل المنتجات...</p>
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
                    <img src={product.imageUrl} alt={product.nameAr || "منتج فلج"} className="product-image" />
                  ) : (
                    <div className="product-image-placeholder">فلج</div>
                  )}
                </div>

                <div className="product-body">
                  <div className="product-title-row">
                    <div>
                      <h3>{product.nameAr}</h3>
                      <p>{product.description || "لا يوجد وصف مضاف لهذا المنتج."}</p>
                    </div>
                    <div className="product-status-stack">
                      <span className={`availability ${product.isAvailable ? "available" : "unavailable"}`}>
                        {availabilityLabel(product.isAvailable)}
                      </span>
                      <span className={`availability ${statusTone(product.approvalStatus)}`}>
                        {approvalStatusLabel(product.approvalStatus)}
                      </span>
                    </div>
                  </div>

                  <dl className="product-meta">
                    <div>
                      <dt>التصنيف</dt>
                      <dd>{categoryLabel(product.category)}</dd>
                    </div>
                    <div>
                      <dt>نوع المياه</dt>
                      <dd>{product.waterType || "-"}</dd>
                    </div>
                    <div>
                      <dt>الحجم</dt>
                      <dd>{product.sizeLabel || "-"}</dd>
                    </div>
                    <div>
                      <dt>السعر</dt>
                      <dd>{formatPrice(product.price)}</dd>
                    </div>
                    <div>
                      <dt>وقت التوصيل</dt>
                      <dd>{product.deliveryEstimate || "-"}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
