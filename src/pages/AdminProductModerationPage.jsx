import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const STATUS_LABELS = {
  pending_review: "بانتظار المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  hidden: "مخفي",
};

const FILTERS = [
  { value: "all", label: "الكل" },
  { value: "pending_review", label: "بانتظار المراجعة" },
  { value: "approved", label: "معتمد" },
  { value: "rejected", label: "مرفوض" },
  { value: "hidden", label: "مخفي" },
];

const CATEGORY_LABELS = {
  water_bottles: "مياه شرب عبوات",
  bottled_water: "مياه شرب عبوات",
  water_gallons: "مياه شرب جالونات",
  cartons: "مياه شرب جالونات",
  sparkling_water: "مياه فوارة",
  water_tankers: "صهاريج مياه",
  tanker: "صهاريج مياه",
};

const CATEGORY_OPTIONS = [
  { value: "water_bottles", label: "مياه شرب عبوات" },
  { value: "water_gallons", label: "مياه شرب جالونات" },
  { value: "sparkling_water", label: "مياه فوارة" },
  { value: "water_tankers", label: "صهاريج مياه" },
];

const WATER_TYPE_OPTIONS = ["مياه شرب", "مياه نقية", "مياه معدنية", "مياه فوارة"];

const SIZE_OPTIONS = [
  { value: "200ml", label: "200 مل", volumeLiters: "0.2" },
  { value: "330ml", label: "330 مل", volumeLiters: "0.33" },
  { value: "500ml", label: "500 مل", volumeLiters: "0.5" },
  { value: "1.5l", label: "1.5 لتر", volumeLiters: "1.5" },
  { value: "5l", label: "5 لتر", volumeLiters: "5" },
  { value: "carton-12x500ml", label: "كرتون 12 × 500 مل", volumeLiters: "6" },
  { value: "carton-24x200ml", label: "كرتون 24 × 200 مل", volumeLiters: "4.8" },
  { value: "tanker-1000l", label: "صهريج 1000 لتر", volumeLiters: "1000" },
  { value: "tanker-2000l", label: "صهريج 2000 لتر", volumeLiters: "2000" },
  { value: "custom", label: "حجم مخصص", volumeLiters: "" },
];

const DELIVERY_OPTIONS = ["خلال 30 دقيقة", "خلال ساعة", "خلال ساعتين", "نفس اليوم", "خلال 24 ساعة"];

const initialEditForm = {
  name_ar: "",
  name_en: "",
  category: "water_bottles",
  water_type: "مياه شرب",
  size_option: "500ml",
  size_label: "500 مل",
  volume_liters: "0.5",
  price: "",
  delivery_estimate: "خلال ساعة",
  is_available: true,
  description: "",
};

export default function AdminProductModerationPage() {
  const [products, setProducts] = useState([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageFailed, setSelectedImageFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingProductId, setReviewingProductId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextProducts = await fetchProductsForModeration();
        if (!cancelled) setProducts(nextProducts);
      } catch (error) {
        if (!cancelled) setErrorMessage(error.message || "تعذر تحميل منتجات الموردين.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleProducts = useMemo(
    () =>
      activeStatus === "all"
        ? products
        : products.filter((product) => normalizeStatus(product.approval_status) === activeStatus),
    [activeStatus, products]
  );

  async function reviewProduct(product, nextStatus) {
    setMessage("");
    setErrorMessage("");

    if (!supabase) {
      setErrorMessage("Supabase غير مفعل حاليًا.");
      return;
    }

    let notes = product.admin_review_notes || "";
    if (nextStatus === "rejected") {
      const nextNotes = window.prompt("ملاحظات الرفض", notes);
      if (nextNotes === null) return;
      notes = nextNotes.trim();
    }

    setReviewingProductId(product.id);

    try {
      const userId = await getCurrentUserId();
      const reviewedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("products")
        .update({
          approval_status: nextStatus,
          is_visible: nextStatus === "approved",
          admin_review_notes: nextStatus === "rejected" ? notes : product.admin_review_notes,
          reviewed_by: userId,
          reviewed_at: reviewedAt,
        })
        .eq("id", product.id)
        .select(productModerationSelect())
        .single();

      if (error) throw error;

      setProducts((current) => current.map((item) => (item.id === product.id ? data : item)));
      setMessage(productActionMessage(nextStatus));
    } catch (error) {
      setErrorMessage(error.message || "تعذر تحديث حالة المنتج.");
    } finally {
      setReviewingProductId(null);
    }
  }

  function openEditProduct(product) {
    setEditingProductId(product.id);
    setEditForm(formFromProduct(product));
    setMessage("");
    setErrorMessage("");
  }

  function closeEditProduct() {
    setEditingProductId(null);
    setEditForm(initialEditForm);
    setIsSavingEdit(false);
  }

  function updateEditForm(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function updateEditSizeOption(value) {
    const selectedSize = SIZE_OPTIONS.find((option) => option.value === value);
    setEditForm((current) => ({
      ...current,
      size_option: value,
      size_label: selectedSize && selectedSize.value !== "custom" ? selectedSize.label : "",
      volume_liters: selectedSize && selectedSize.value !== "custom" ? selectedSize.volumeLiters : "",
    }));
  }

  async function saveProductEdits(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const validationError = validateEditForm(editForm);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSavingEdit(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .update({
          name_ar: editForm.name_ar.trim(),
          name_en: editForm.name_en.trim() || null,
          category: editForm.category,
          water_type: editForm.water_type,
          size_label: editForm.size_label.trim(),
          volume_liters: Number(editForm.volume_liters),
          price: Number(editForm.price),
          delivery_estimate: editForm.delivery_estimate,
          is_available: Boolean(editForm.is_available),
          description: editForm.description.trim() || null,
        })
        .eq("id", editingProductId)
        .select(productModerationSelect())
        .single();

      if (error) throw error;

      setProducts((current) => current.map((product) => (product.id === editingProductId ? data : product)));
      setMessage("تم تحديث بيانات المنتج بدون تغيير حالة المراجعة.");
      closeEditProduct();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Admin product edit failed:", error);
      }
      setErrorMessage("تعذر تحديث بيانات المنتج حاليًا.");
      setIsSavingEdit(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الإدارة</p>
          <h1>مراجعة الكتالوج</h1>
          <p>اعتماد منتجات الموردين قبل ظهورها للعملاء.</p>
        </div>
      </header>

      <section className="status-tabs" aria-label="تصفية المنتجات">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={activeStatus === filter.value ? "active" : "ghost"}
            onClick={() => setActiveStatus(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </section>

      {message ? <p className="auth-alert success">{message}</p> : null}
      {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}

      <section className="panel">
        {isLoading ? (
          <p className="empty-state">جاري تحميل المنتجات...</p>
        ) : visibleProducts.length === 0 ? (
          <div className="empty-state">
            <strong>لا توجد منتجات للمراجعة حاليًا</strong>
            <span>ستظهر هنا المنتجات التي يضيفها الموردون من لوحة الشركة.</span>
          </div>
        ) : (
          <>
          <div className="table-wrap">
            <table className="falaj-table">
              <thead>
                <tr>
                  <th>المورد</th>
                  <th>المنتج</th>
                  <th>التصنيف</th>
                  <th>السعر</th>
                  <th>الصورة</th>
                  <th>الوصف</th>
                  <th>حالة المراجعة</th>
                  <th>الظهور</th>
                  <th>تاريخ الإضافة</th>
                  <th>ملاحظات الأدمن</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.companies?.name || "مورد غير محدد"}</td>
                    <td>{product.name_ar || product.name_en || "-"}</td>
                    <td>{categoryLabel(product.category)}</td>
                    <td>{formatPrice(product.price)}</td>
                    <td>
                      {product.image_url ? (
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            setSelectedImage(product.image_url);
                            setSelectedImageFailed(false);
                          }}
                        >
                          عرض الصورة
                        </button>
                      ) : (
                        <span className="muted-text">لا توجد صورة</span>
                      )}
                    </td>
                    <td>{product.description || "-"}</td>
                    <td>
                      <span className={`status ${normalizeStatus(product.approval_status)}`}>
                        {STATUS_LABELS[normalizeStatus(product.approval_status)]}
                      </span>
                    </td>
                    <td>{product.is_visible ? "ظاهر للعملاء" : "غير ظاهر"}</td>
                    <td>{formatDate(product.created_at)}</td>
                    <td>{product.admin_review_notes || "-"}</td>
                    <td>
                      <div className="row-actions wide-actions">
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => openEditProduct(product)}
                          disabled={reviewingProductId === product.id}
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewProduct(product, "approved")}
                          disabled={reviewingProductId === product.id}
                        >
                          {normalizeStatus(product.approval_status) === "hidden" ? "إظهار واعتماد" : "اعتماد"}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => reviewProduct(product, "rejected")}
                          disabled={reviewingProductId === product.id}
                        >
                          رفض
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => reviewProduct(product, "hidden")}
                          disabled={reviewingProductId === product.id}
                        >
                          إخفاء
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="moderation-mobile-list">
            {visibleProducts.map((product) => (
              <article className="moderation-mobile-card" key={`mobile-${product.id}`}>
                <div className="moderation-mobile-header">
                  <div>
                    <strong>{product.name_ar || product.name_en || "-"}</strong>
                    <span>{product.companies?.name || "مورد غير محدد"}</span>
                  </div>
                  <span className={`status ${normalizeStatus(product.approval_status)}`}>
                    {STATUS_LABELS[normalizeStatus(product.approval_status)]}
                  </span>
                </div>

                <dl className="moderation-mobile-meta">
                  <div>
                    <dt>التصنيف</dt>
                    <dd>{categoryLabel(product.category)}</dd>
                  </div>
                  <div>
                    <dt>السعر</dt>
                    <dd>{formatPrice(product.price)}</dd>
                  </div>
                  <div>
                    <dt>الظهور</dt>
                    <dd>{product.is_visible ? "ظاهر للعملاء" : "غير ظاهر"}</dd>
                  </div>
                  <div>
                    <dt>تاريخ الإضافة</dt>
                    <dd>{formatDate(product.created_at)}</dd>
                  </div>
                </dl>

                {product.description ? <p className="moderation-mobile-description">{product.description}</p> : null}

                <div className="row-actions moderation-mobile-actions">
                  {product.image_url ? (
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setSelectedImage(product.image_url);
                        setSelectedImageFailed(false);
                      }}
                    >
                      عرض الصورة
                    </button>
                  ) : (
                    <span className="muted-text">لا توجد صورة</span>
                  )}
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => openEditProduct(product)}
                    disabled={reviewingProductId === product.id}
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewProduct(product, "approved")}
                    disabled={reviewingProductId === product.id}
                  >
                    {normalizeStatus(product.approval_status) === "hidden" ? "إظهار واعتماد" : "اعتماد"}
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => reviewProduct(product, "rejected")}
                    disabled={reviewingProductId === product.id}
                  >
                    رفض
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => reviewProduct(product, "hidden")}
                    disabled={reviewingProductId === product.id}
                  >
                    إخفاء
                  </button>
                </div>
              </article>
            ))}
          </div>
          </>
        )}
      </section>

      {selectedImage ? (
        <div className="details-backdrop" role="presentation" onClick={() => setSelectedImage(null)}>
          <aside className="details-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="details-header">
              <h2>صورة المنتج</h2>
              <button
                type="button"
                className="ghost close-button"
                onClick={() => {
                  setSelectedImage(null);
                  setSelectedImageFailed(false);
                }}
              >
                إغلاق
              </button>
            </div>
            {selectedImageFailed ? (
              <div className="product-image-placeholder product-image-placeholder-large">
                لا توجد صورة لهذا المنتج
              </div>
            ) : (
              <img
                src={selectedImage}
                alt="صورة المنتج"
                className="product-image"
                onError={() => setSelectedImageFailed(true)}
              />
            )}
          </aside>
        </div>
      ) : null}

      {editingProductId ? (
        <div className="details-backdrop" role="presentation" onClick={closeEditProduct}>
          <aside className="details-panel details-panel-wide" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="details-header">
              <h2>تعديل بيانات المنتج</h2>
              <button type="button" className="ghost close-button" onClick={closeEditProduct}>
                إغلاق
              </button>
            </div>
            <ProductEditForm
              form={editForm}
              isSaving={isSavingEdit}
              onChange={updateEditForm}
              onSizeOptionChange={updateEditSizeOption}
              onSubmit={saveProductEdits}
              onCancel={closeEditProduct}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function productModerationSelect() {
  return [
    "id",
    "company_id",
    "name_ar",
    "name_en",
    "category",
    "water_type",
    "size_label",
    "volume_liters",
    "price",
    "image_url",
    "description",
    "delivery_estimate",
    "approval_status",
    "admin_review_notes",
    "reviewed_by",
    "reviewed_at",
    "is_visible",
    "is_available",
    "created_at",
    "companies(name, is_active, onboarding_status)",
  ].join(",");
}

function ProductEditForm({ form, isSaving, onChange, onSizeOptionChange, onSubmit, onCancel }) {
  const isCustomSize = form.size_option === "custom";

  return (
    <form className="product-form admin-product-edit-form" onSubmit={onSubmit}>
      <label>
        الاسم بالعربي
        <input value={form.name_ar} onChange={(event) => onChange("name_ar", event.target.value)} required />
      </label>
      <label>
        الاسم بالإنجليزي
        <input value={form.name_en} onChange={(event) => onChange("name_en", event.target.value)} />
      </label>
      <label>
        التصنيف
        <select value={form.category} onChange={(event) => onChange("category", event.target.value)}>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        نوع المياه
        <select value={form.water_type} onChange={(event) => onChange("water_type", event.target.value)}>
          {WATER_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        الحجم/الوحدة
        <select value={form.size_option} onChange={(event) => onSizeOptionChange(event.target.value)}>
          {SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        الحجم المعروض
        <input
          value={form.size_label}
          onChange={(event) => onChange("size_label", event.target.value)}
          readOnly={!isCustomSize}
          required
        />
      </label>
      <label>
        الحجم باللتر
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.volume_liters}
          onChange={(event) => onChange("volume_liters", event.target.value)}
          readOnly={!isCustomSize}
          required
        />
      </label>
      <label>
        السعر
        <input type="number" min="0.001" step="0.001" value={form.price} onChange={(event) => onChange("price", event.target.value)} required />
      </label>
      <label>
        مدة التوصيل
        <select value={form.delivery_estimate} onChange={(event) => onChange("delivery_estimate", event.target.value)}>
          {DELIVERY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        التوفر
        <select value={form.is_available ? "available" : "unavailable"} onChange={(event) => onChange("is_available", event.target.value === "available")}>
          <option value="available">متوفر</option>
          <option value="unavailable">غير متوفر</option>
        </select>
      </label>
      <label className="product-form-wide">
        الوصف
        <textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} rows={4} />
      </label>
      <div className="product-form-actions">
        <button type="submit" className="primary-action" disabled={isSaving}>
          {isSaving ? "جاري الحفظ..." : "حفظ التعديل"}
        </button>
        <button type="button" className="ghost" onClick={onCancel} disabled={isSaving}>
          إلغاء
        </button>
      </div>
    </form>
  );
}

async function fetchProductsForModeration() {
  if (!supabase) {
    throw new Error("Supabase غير مفعل حاليًا.");
  }

  const { data, error } = await supabase
    .from("products")
    .select(productModerationSelect())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error("تعذر تحديد مستخدم الأدمن الحالي.");
  return data.user.id;
}

function normalizeStatus(status) {
  return status || "pending_review";
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || "تصنيف غير محدد";
}

function normalizeCategory(category) {
  const legacyMap = {
    bottled_water: "water_bottles",
    cartons: "water_gallons",
    tanker: "water_tankers",
    scheduled_delivery: "water_bottles",
  };
  const normalized = legacyMap[category] ?? category;
  return CATEGORY_OPTIONS.some((option) => option.value === normalized) ? normalized : "water_bottles";
}

function findSizeOption(sizeLabel, volumeLiters) {
  const volume = volumeLiters === null || volumeLiters === undefined ? "" : String(Number(volumeLiters));
  const matched = SIZE_OPTIONS.find((option) => {
    if (option.value === "custom") return false;
    return option.label === sizeLabel || String(Number(option.volumeLiters)) === volume;
  });
  return matched ?? { value: "custom" };
}

function formFromProduct(product) {
  const matchedSize = findSizeOption(product.size_label, product.volume_liters);

  return {
    name_ar: product.name_ar || "",
    name_en: product.name_en || "",
    category: normalizeCategory(product.category),
    water_type: WATER_TYPE_OPTIONS.includes(product.water_type) ? product.water_type : "مياه شرب",
    size_option: matchedSize.value,
    size_label: product.size_label || "",
    volume_liters: product.volume_liters ?? "",
    price: product.price ?? "",
    delivery_estimate: DELIVERY_OPTIONS.includes(product.delivery_estimate) ? product.delivery_estimate : "خلال ساعة",
    is_available: Boolean(product.is_available),
    description: product.description || "",
  };
}

function validateEditForm(form) {
  if (!form.name_ar.trim()) return "يرجى إدخال اسم المنتج بالعربي.";
  if (!CATEGORY_OPTIONS.some((option) => option.value === form.category)) return "يرجى اختيار التصنيف من القائمة.";
  if (!WATER_TYPE_OPTIONS.includes(form.water_type)) return "يرجى اختيار نوع المياه من القائمة.";
  if (!SIZE_OPTIONS.some((option) => option.value === form.size_option)) return "يرجى اختيار الحجم من القائمة.";
  if (!form.size_label.trim()) return "يرجى تحديد الحجم/الوحدة.";

  const volume = Number(form.volume_liters);
  if (!Number.isFinite(volume) || volume <= 0) return "يرجى إدخال حجم صحيح باللتر.";

  const price = Number(form.price);
  if (!Number.isFinite(price) || price <= 0) return "يرجى إدخال سعر صحيح أكبر من صفر.";

  if (!DELIVERY_OPTIONS.includes(form.delivery_estimate)) return "يرجى اختيار مدة التوصيل من القائمة.";
  return "";
}

function formatPrice(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-OM");
}

function productActionMessage(status) {
  if (status === "approved") return "تم اعتماد المنتج. سيظهر للعملاء عند توفره وتفعيل الشركة.";
  if (status === "rejected") return "تم رفض المنتج وإخفاؤه عن العملاء.";
  return "تم إخفاء المنتج عن العملاء.";
}
