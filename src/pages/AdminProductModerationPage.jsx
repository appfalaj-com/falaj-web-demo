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

const WATER_TYPE_OPTIONS = [
  "مياه شرب / مياه معبأة",
  "مياه منقاة",
  "مياه محلاة",
  "مياه جوفية",
  "مياه نبع / عين",
  "مياه معدنية",
  "مياه فوارة",
  "مياه قلوية",
  "مياه منكهة",
];

const LEGACY_WATER_TYPE_OPTIONS = ["مياه شرب", "مياه نقية"];

const SELLING_UNIT_OPTIONS = [
  { value: "unit", label: "عبوة", priceLabel: "للعبوة" },
  { value: "pack", label: "حزمة", priceLabel: "للحزمة" },
  { value: "carton", label: "كرتون", priceLabel: "للكرتون" },
  { value: "gallon", label: "عبوة كبيرة", priceLabel: "للعبوة الكبيرة" },
  { value: "tanker", label: "صهريج", priceLabel: "للصهريج" },
];

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
  water_type: "مياه شرب / مياه معبأة",
  size_option: "500ml",
  size_label: "500 مل",
  volume_liters: "0.5",
  unit_volume_liters: "0.5",
  selling_unit: "unit",
  units_per_package: "1",
  package_label: "عبوة 500 مل",
  price: "",
  delivery_estimate: "خلال ساعة",
  is_available: true,
  description: "",
  stock_quantity: "0",
  min_order_quantity: "1",
  max_order_quantity: "",
  track_inventory: true,
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
    setEditForm((current) => {
      const next = { ...current, [field]: value };
      if (["unit_volume_liters", "selling_unit", "units_per_package"].includes(field)) {
        next.volume_liters = totalVolumeLiters(next.unit_volume_liters, next.units_per_package);
        next.package_label = buildPackageLabel(next.unit_volume_liters, next.selling_unit, next.units_per_package);
        next.size_label = next.package_label;
      }
      return next;
    });
  }

  function updateEditSizeOption(value) {
    const selectedSize = SIZE_OPTIONS.find((option) => option.value === value);
    setEditForm((current) => ({
      ...current,
      size_option: value,
      unit_volume_liters: selectedSize && selectedSize.value !== "custom" ? selectedSize.volumeLiters : "",
      volume_liters:
        selectedSize && selectedSize.value !== "custom"
          ? totalVolumeLiters(selectedSize.volumeLiters, current.units_per_package)
          : "",
      package_label:
        selectedSize && selectedSize.value !== "custom"
          ? buildPackageLabel(selectedSize.volumeLiters, current.selling_unit, current.units_per_package)
          : "",
      size_label:
        selectedSize && selectedSize.value !== "custom"
          ? buildPackageLabel(selectedSize.volumeLiters, current.selling_unit, current.units_per_package)
          : "",
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
          size_label: editForm.package_label.trim(),
          unit_volume_liters: Number(editForm.unit_volume_liters),
          selling_unit: editForm.selling_unit,
          units_per_package: Number(editForm.units_per_package),
          package_label: editForm.package_label.trim(),
          volume_liters: Number(editForm.unit_volume_liters) * Number(editForm.units_per_package),
          price: Number(editForm.price),
          delivery_estimate: editForm.delivery_estimate,
          is_available: Boolean(editForm.is_available),
          description: editForm.description.trim() || null,
          stock_quantity: Number(editForm.stock_quantity ?? 0),
          min_order_quantity: Number(editForm.min_order_quantity ?? 1),
          max_order_quantity: editForm.max_order_quantity ? Number(editForm.max_order_quantity) : null,
          track_inventory: Boolean(editForm.track_inventory),
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
                  <th>نوع المياه</th>
                  <th>وحدة البيع</th>
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
                    <td>{product.water_type || "-"}</td>
                    <td>
                      {productPackageLabel(product)}
                      <br />
                      <span className="muted-text">الإجمالي: {product.volume_liters ? `${Number(product.volume_liters).toFixed(3)} لتر` : "-"}</span>
                    </td>
                    <td>{formatPrice(product.price)} {sellingUnitPriceLabel(product.selling_unit)}</td>
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
                    <dt>نوع المياه</dt>
                    <dd>{product.water_type || "-"}</dd>
                  </div>
                  <div>
                    <dt>وحدة البيع</dt>
                    <dd>{productPackageLabel(product)}</dd>
                  </div>
                  <div>
                    <dt>السعر</dt>
                    <dd>{formatPrice(product.price)} {sellingUnitPriceLabel(product.selling_unit)}</dd>
                  </div>
                  <div>
                    <dt>إجمالي اللترات</dt>
                    <dd>{product.volume_liters ? `${Number(product.volume_liters).toFixed(3)} لتر` : "-"}</dd>
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
    "unit_volume_liters",
    "selling_unit",
    "units_per_package",
    "package_label",
    "price",
    "image_url",
    "description",
    "delivery_estimate",
    "stock_quantity",
    "min_order_quantity",
    "max_order_quantity",
    "track_inventory",
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
          {waterTypeOptionsForValue(form.water_type).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        حجم الوحدة الواحدة
        <select value={form.size_option} onChange={(event) => onSizeOptionChange(event.target.value)}>
          {SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        حجم الوحدة باللتر
        <input
          type="number"
          min="0"
          step="0.001"
          value={form.unit_volume_liters}
          onChange={(event) => onChange("unit_volume_liters", event.target.value)}
          readOnly={!isCustomSize}
          required
        />
      </label>
      <label>
        وحدة البيع
        <select value={form.selling_unit} onChange={(event) => onChange("selling_unit", event.target.value)}>
          {SELLING_UNIT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        عدد الوحدات داخل البيع
        <input type="number" min="1" step="1" value={form.units_per_package} onChange={(event) => onChange("units_per_package", event.target.value)} required />
      </label>
      <label>
        وصف وحدة البيع
        <input value={form.package_label} onChange={(event) => onChange("package_label", event.target.value)} required />
      </label>
      <label>
        إجمالي اللترات لوحدة البيع
        <input type="number" min="0" step="0.001" value={form.volume_liters} readOnly required />
      </label>
      <label>
        سعر وحدة البيع
        <input type="number" min="0.001" step="0.001" value={form.price} onChange={(event) => onChange("price", event.target.value)} required />
        <small>السعر هو {sellingUnitPriceLabel(form.selling_unit)} كاملًا.</small>
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
      <label>
        كمية المخزون
        <input type="number" min="0" step="1" value={form.stock_quantity} onChange={(event) => onChange("stock_quantity", event.target.value)} />
      </label>
      <label>
        الحد الأدنى للطلب
        <input type="number" min="1" step="1" value={form.min_order_quantity} onChange={(event) => onChange("min_order_quantity", event.target.value)} />
      </label>
      <label>
        الحد الأقصى للطلب
        <input type="number" min="1" step="1" value={form.max_order_quantity} onChange={(event) => onChange("max_order_quantity", event.target.value)} placeholder="اختياري" />
      </label>
      <label>
        تتبع المخزون
        <select value={form.track_inventory ? "track" : "no-track"} onChange={(event) => onChange("track_inventory", event.target.value === "track")}>
          <option value="track">مفعل</option>
          <option value="no-track">غير مفعل</option>
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

function waterTypeOptionsForValue(value) {
  const options = [...WATER_TYPE_OPTIONS, ...LEGACY_WATER_TYPE_OPTIONS];
  return value && !options.includes(value) ? [...options, value] : options;
}

function isValidWaterType(value) {
  return Boolean(value?.trim()) && waterTypeOptionsForValue(value).includes(value);
}

function sellingUnitOption(value) {
  return SELLING_UNIT_OPTIONS.find((option) => option.value === value) ?? SELLING_UNIT_OPTIONS[0];
}

function sellingUnitLabel(value) {
  return sellingUnitOption(value).label;
}

function sellingUnitPriceLabel(value) {
  return sellingUnitOption(value).priceLabel;
}

function formatUnitVolumeLabel(value) {
  const volume = Number(value);
  if (!Number.isFinite(volume) || volume <= 0) return "";
  if (volume < 1) return `${Number((volume * 1000).toFixed(3))} مل`;
  return `${Number(volume.toFixed(3))} لتر`;
}

function buildPackageLabel(unitVolumeLiters, sellingUnit, unitsPerPackage) {
  const unitLabel = formatUnitVolumeLabel(unitVolumeLiters);
  const unitName = sellingUnitLabel(sellingUnit);
  const count = Number(unitsPerPackage);
  if (!unitLabel) return "";
  if (sellingUnit === "unit" || sellingUnit === "gallon" || sellingUnit === "tanker" || count === 1) {
    return `${unitName} ${unitLabel}`;
  }
  return `${unitName} ${unitLabel} × ${count} عبوة`;
}

function totalVolumeLiters(unitVolumeLiters, unitsPerPackage) {
  const volume = Number(unitVolumeLiters);
  const count = Number(unitsPerPackage);
  if (!Number.isFinite(volume) || !Number.isInteger(count) || volume <= 0 || count <= 0) return "";
  return String(Number((volume * count).toFixed(3)));
}

function productPackageLabel(product) {
  return product.package_label || product.size_label || product.volume_liters || "-";
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
  const unitVolume = product.unit_volume_liters ?? product.volume_liters;
  const unitsPerPackage = product.units_per_package ?? 1;
  const matchedSize = findSizeOption(product.size_label, unitVolume);

  return {
    name_ar: product.name_ar || "",
    name_en: product.name_en || "",
    category: normalizeCategory(product.category),
    water_type: product.water_type || "مياه شرب / مياه معبأة",
    size_option: matchedSize.value,
    size_label: product.size_label || product.package_label || "",
    volume_liters: product.volume_liters ?? totalVolumeLiters(unitVolume, unitsPerPackage),
    unit_volume_liters: unitVolume ?? "",
    selling_unit: product.selling_unit || "unit",
    units_per_package: unitsPerPackage,
    package_label: product.package_label || product.size_label || buildPackageLabel(unitVolume, product.selling_unit || "unit", unitsPerPackage),
    price: product.price ?? "",
    delivery_estimate: DELIVERY_OPTIONS.includes(product.delivery_estimate) ? product.delivery_estimate : "خلال ساعة",
    is_available: Boolean(product.is_available),
    description: product.description || "",
    stock_quantity: product.stock_quantity ?? "0",
    min_order_quantity: product.min_order_quantity ?? "1",
    max_order_quantity: product.max_order_quantity ?? "",
    track_inventory: product.track_inventory ?? true,
  };
}

function validateEditForm(form) {
  if (!form.name_ar.trim()) return "يرجى إدخال اسم المنتج بالعربي.";
  if (!CATEGORY_OPTIONS.some((option) => option.value === form.category)) return "يرجى اختيار التصنيف من القائمة.";
  if (!isValidWaterType(form.water_type)) return "يرجى اختيار نوع المياه من القائمة.";
  if (!SIZE_OPTIONS.some((option) => option.value === form.size_option)) return "يرجى اختيار الحجم من القائمة.";
  if (!SELLING_UNIT_OPTIONS.some((option) => option.value === form.selling_unit)) return "يرجى اختيار وحدة البيع من القائمة.";
  const unitVolume = Number(form.unit_volume_liters);
  if (!Number.isFinite(unitVolume) || unitVolume <= 0) return "يرجى إدخال حجم الوحدة الواحدة باللتر كرقم أكبر من صفر.";
  const unitsPerPackage = Number(form.units_per_package);
  if (!Number.isInteger(unitsPerPackage) || unitsPerPackage <= 0) return "يرجى إدخال عدد وحدات صحيح داخل وحدة البيع.";
  if (!form.package_label.trim()) return "يرجى تحديد وصف وحدة البيع.";

  const volume = Number(form.volume_liters);
  if (!Number.isFinite(volume) || volume <= 0) return "يرجى إدخال حجم صحيح باللتر.";

  const price = Number(form.price);
  if (!Number.isFinite(price) || price <= 0) return "يرجى إدخال سعر صحيح أكبر من صفر.";

  if (!DELIVERY_OPTIONS.includes(form.delivery_estimate)) return "يرجى اختيار مدة التوصيل من القائمة.";
  const stockQuantity = Number(form.stock_quantity);
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) return "يرجى إدخال كمية مخزون صحيحة لا تقل عن صفر.";
  const minOrderQuantity = Number(form.min_order_quantity);
  if (!Number.isInteger(minOrderQuantity) || minOrderQuantity <= 0) return "يرجى إدخال حد أدنى صحيح للطلب.";
  if (form.max_order_quantity) {
    const maxOrderQuantity = Number(form.max_order_quantity);
    if (!Number.isInteger(maxOrderQuantity) || maxOrderQuantity <= 0) return "يرجى إدخال حد أقصى صحيح للطلب.";
    if (maxOrderQuantity < minOrderQuantity) return "الحد الأقصى للطلب يجب أن يكون أكبر من أو يساوي الحد الأدنى.";
  }
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
