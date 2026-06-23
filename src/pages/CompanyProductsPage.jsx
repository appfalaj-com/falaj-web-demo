import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import {
  createCompanyProductForReview,
  getProductMetrics,
  getProductsByCompanyFromSupabase,
  updateApprovedCompanyProductVisibility,
  updateCompanyProductAvailability,
  updateCompanyProductForReview,
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

const STATUS_LABELS = {
  pending_review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  hidden: "مخفي",
};

const PRODUCT_LOAD_ERROR = "تعذر تحميل منتجات الشركة من قاعدة البيانات. حاول التحديث مرة أخرى.";
const PRODUCT_SAVE_ERROR = "تعذر حفظ المنتج حاليًا. حاول مرة أخرى.";
const PRODUCT_AVAILABILITY_ERROR = "تعذر تحديث توفر المنتج حاليًا. حاول مرة أخرى.";
const PRODUCT_VISIBILITY_ERROR = "تعذر تحديث ظهور المنتج حاليًا. حاول مرة أخرى.";

function formatPrice(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-OM");
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
  return STATUS_LABELS[status || "pending_review"] ?? "قيد المراجعة";
}

function statusTone(status) {
  if (status === "approved") return "available";
  if (status === "rejected" || status === "hidden") return "unavailable";
  return "pending";
}

function productVisibilityMessage(product) {
  if (product.approvalStatus === "pending_review") return "بانتظار مراجعة إدارة فلج";
  if (product.approvalStatus === "rejected") return "يحتاج تعديل أو مراجعة قبل الظهور";
  if (product.approvalStatus === "approved" && product.isVisible && product.isAvailable) return "ظاهر للعملاء";
  if (product.approvalStatus === "approved" && !product.isVisible) return "معتمد لكنه مخفي";
  if (product.approvalStatus === "approved" && !product.isAvailable) return "معتمد لكنه غير متوفر";
  if (product.approvalStatus === "hidden") return "مخفي عن العملاء";
  return "بانتظار مراجعة إدارة فلج";
}

function formFromProduct(product) {
  return {
    nameAr: product.nameAr || "",
    nameEn: product.nameEn || "",
    category: product.category || "bottled_water",
    waterType: product.waterType || "",
    sizeLabel: product.sizeLabel || "",
    volumeLiters: product.volumeLiters || "",
    price: product.price || "",
    imageUrl: product.imageUrl || "",
    description: product.description || "",
    deliveryEstimate: product.deliveryEstimate || "",
    isAvailable: Boolean(product.isAvailable),
  };
}

export default function CompanyProductsPage({ companyId }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [updatingProductId, setUpdatingProductId] = useState(null);
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
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          setErrorMessage(PRODUCT_LOAD_ERROR);
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

  function openCreateForm() {
    setEditingProductId(null);
    setForm(initialProductForm);
    setIsFormOpen(true);
    setMessage("");
    setErrorMessage("");
  }

  function openEditForm(product) {
    setEditingProductId(product.id);
    setForm(formFromProduct(product));
    setIsFormOpen(true);
    setMessage("");
    setErrorMessage("");
  }

  function closeForm() {
    setEditingProductId(null);
    setForm(initialProductForm);
    setIsFormOpen(false);
  }

  function validateForm() {
    if (!companyId) return "تعذر تحديد الشركة الحالية.";
    if (!form.nameAr.trim()) return "يرجى إدخال اسم المنتج بالعربي.";
    if (!form.category.trim()) return "يرجى اختيار التصنيف.";
    if (!form.waterType.trim()) return "يرجى إدخال نوع المياه.";

    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) return "يرجى إدخال سعر صحيح أكبر من صفر.";

    if (form.volumeLiters) {
      const volume = Number(form.volumeLiters);
      if (!Number.isFinite(volume) || volume <= 0) return "يرجى إدخال حجم صحيح باللتر.";
    }

    return "";
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const payload = {
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
    };

    setIsSaving(true);
    try {
      if (editingProductId) {
        const updatedProduct = await updateCompanyProductForReview(companyId, editingProductId, payload);
        setProducts((current) => current.map((product) => (product.id === editingProductId ? updatedProduct : product)));
        setMessage("تم تحديث المنتج وإرساله للمراجعة من إدارة فلج.");
      } else {
        const createdProduct = await createCompanyProductForReview(companyId, payload);
        setProducts((current) => [createdProduct, ...current]);
        setMessage("تم إرسال المنتج للمراجعة من إدارة فلج.");
      }

      closeForm();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Save product failed:", error);
      }
      setErrorMessage(PRODUCT_SAVE_ERROR);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleAvailability(product) {
    setMessage("");
    setErrorMessage("");
    setUpdatingProductId(product.id);

    try {
      const updatedProduct = await updateCompanyProductAvailability(companyId, product.id, !product.isAvailable);
      setProducts((current) => current.map((item) => (item.id === product.id ? updatedProduct : item)));
      setMessage("تم تحديث توفر المنتج.");
    } catch (error) {
      setErrorMessage(PRODUCT_AVAILABILITY_ERROR);
    } finally {
      setUpdatingProductId(null);
    }
  }

  async function toggleVisibility(product) {
    if (product.approvalStatus !== "approved") return;

    setMessage("");
    setErrorMessage("");
    setUpdatingProductId(product.id);

    try {
      const updatedProduct = await updateApprovedCompanyProductVisibility(companyId, product.id, !product.isVisible);
      setProducts((current) => current.map((item) => (item.id === product.id ? updatedProduct : item)));
      setMessage(updatedProduct.isVisible ? "تم إظهار المنتج للعملاء." : "تم إخفاء المنتج عن العملاء.");
    } catch (error) {
      setErrorMessage(PRODUCT_VISIBILITY_ERROR);
    } finally {
      setUpdatingProductId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>المنتجات والأسعار</h1>
          <p>إدارة كتالوج شركتكم مع الحفاظ على مراجعة إدارة فلج قبل الظهور للعملاء.</p>
        </div>
        <button type="button" className="primary-action" onClick={isFormOpen ? closeForm : openCreateForm}>
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
              <h2>{editingProductId ? "تعديل المنتج" : "إضافة منتج للمراجعة"}</h2>
              <p>
                {editingProductId
                  ? "سيعود المنتج إلى حالة قيد المراجعة ولن يظهر للعملاء قبل اعتماد إدارة فلج."
                  : "سيتم حفظ المنتج بانتظار مراجعة إدارة فلج قبل ظهوره للعملاء."}
              </p>
            </div>
          </div>

          <ProductForm
            form={form}
            isSaving={isSaving}
            isEditing={Boolean(editingProductId)}
            onChange={updateForm}
            onCancel={closeForm}
            onSubmit={handleSaveProduct}
          />
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
        {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}

        {isLoading ? (
          <p className="empty-state">جاري تحميل المنتجات...</p>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <strong>لا توجد منتجات حتى الآن</strong>
            <span>ابدأ بإضافة أول منتج ليتم مراجعته من إدارة فلج.</span>
            <button type="button" className="primary-action" onClick={openCreateForm}>
              إضافة أول منتج
            </button>
          </div>
        ) : (
          <div className="product-list">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isUpdating={updatingProductId === product.id}
                onEdit={openEditForm}
                onToggleAvailability={toggleAvailability}
                onToggleVisibility={toggleVisibility}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProductForm({ form, isSaving, isEditing, onChange, onCancel, onSubmit }) {
  return (
    <form className="product-form" onSubmit={onSubmit}>
      <label>
        الاسم بالعربي
        <input value={form.nameAr} onChange={(event) => onChange("nameAr", event.target.value)} required />
      </label>

      <label>
        الاسم بالإنجليزي
        <input value={form.nameEn} onChange={(event) => onChange("nameEn", event.target.value)} />
      </label>

      <label>
        التصنيف
        <select value={form.category} onChange={(event) => onChange("category", event.target.value)}>
          <option value="bottled_water">مياه شرب عبوات</option>
          <option value="cartons">كراتين مياه</option>
          <option value="tanker">صهاريج مياه</option>
          <option value="scheduled_delivery">توصيل مجدول</option>
        </select>
      </label>

      <label>
        نوع المياه
        <input value={form.waterType} onChange={(event) => onChange("waterType", event.target.value)} required />
      </label>

      <label>
        الحجم/الوحدة
        <input value={form.sizeLabel} onChange={(event) => onChange("sizeLabel", event.target.value)} />
      </label>

      <label>
        الحجم باللتر
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.volumeLiters}
          onChange={(event) => onChange("volumeLiters", event.target.value)}
        />
      </label>

      <label>
        السعر
        <input
          type="number"
          min="0"
          step="0.001"
          value={form.price}
          onChange={(event) => onChange("price", event.target.value)}
          required
        />
      </label>

      <label>
        رابط الصورة
        <input
          type="url"
          value={form.imageUrl}
          onChange={(event) => onChange("imageUrl", event.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </label>

      <label>
        مدة التوصيل
        <input
          value={form.deliveryEstimate}
          onChange={(event) => onChange("deliveryEstimate", event.target.value)}
          placeholder="مثال: خلال ساعتين"
        />
      </label>

      <label className="product-form-wide">
        الوصف
        <textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} rows={4} />
      </label>

      <label className="product-form-check">
        <input
          type="checkbox"
          checked={form.isAvailable}
          onChange={(event) => onChange("isAvailable", event.target.checked)}
        />
        متوفر؟
      </label>

      <div className="product-form-actions">
        <button type="submit" className="primary-action" disabled={isSaving}>
          {isSaving ? "جاري الحفظ..." : isEditing ? "حفظ وإرسال للمراجعة" : "حفظ وإرسال للمراجعة"}
        </button>
        <button type="button" className="ghost" onClick={onCancel} disabled={isSaving}>
          إلغاء
        </button>
      </div>
    </form>
  );
}

function ProductCard({ product, isUpdating, onEdit, onToggleAvailability, onToggleVisibility }) {
  const canToggleVisibility = product.approvalStatus === "approved";
  const rejectionNotes = product.adminReviewNotes || product.admin_review_notes;
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="product-card" key={product.id}>
      <div className="product-image-wrap">
        {product.imageUrl && !imageFailed ? (
          <img
            src={product.imageUrl}
            alt={product.nameAr || "منتج فلج"}
            className="product-image"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="product-image-placeholder">لا توجد صورة</div>
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
            <span className={`availability ${product.isVisible ? "available" : "unavailable"}`}>
              {product.isVisible ? "ظاهر" : "غير ظاهر"}
            </span>
            <span className={`availability ${statusTone(product.approvalStatus)}`}>
              {approvalStatusLabel(product.approvalStatus)}
            </span>
          </div>
        </div>

        <p className="product-review-message">{productVisibilityMessage(product)}</p>

        {product.approvalStatus === "rejected" && rejectionNotes ? (
          <p className="product-review-message danger">سبب الرفض: {rejectionNotes}</p>
        ) : null}

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
            <dt>الحجم/الوحدة</dt>
            <dd>{product.sizeLabel || product.volumeLiters || "-"}</dd>
          </div>
          <div>
            <dt>السعر</dt>
            <dd>{formatPrice(product.price)}</dd>
          </div>
          <div>
            <dt>آخر تحديث</dt>
            <dd>{formatDate(product.updatedAt || product.createdAt)}</dd>
          </div>
        </dl>

        <div className="row-actions product-actions">
          <button type="button" onClick={() => onEdit(product)}>
            تعديل
          </button>
          <button type="button" className="ghost" onClick={() => onToggleAvailability(product)} disabled={isUpdating}>
            {product.isAvailable ? "جعله غير متوفر" : "جعله متوفرًا"}
          </button>
          {canToggleVisibility ? (
            <button type="button" className="ghost" onClick={() => onToggleVisibility(product)} disabled={isUpdating}>
              {product.isVisible ? "إخفاء" : "إظهار"}
            </button>
          ) : (
            <button type="button" className="ghost" disabled title="الظهور متاح بعد اعتماد المنتج فقط">
              الظهور بعد الاعتماد
            </button>
          )}
          <button type="button" className="ghost" disabled title="الحذف غير متاح حاليًا">
            الحذف غير متاح
          </button>
        </div>
      </div>
    </article>
  );
}
