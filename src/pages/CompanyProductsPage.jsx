import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import {
  createCompanyProductForReview,
  getProductMetrics,
  getProductsByCompanyFromSupabase,
  updateApprovedCompanyProductVisibility,
  updateCompanyProductAvailability,
  updateCompanyProductForReview,
  validateProductImageFile,
} from "../services/productService.js";

const initialProductForm = {
  nameAr: "",
  nameEn: "",
  category: "water_bottles",
  waterType: "مياه شرب / مياه معبأة",
  sizeOption: "500ml",
  sizeLabel: "500 مل",
  volumeLiters: "0.5",
  unitVolumeLiters: "0.5",
  sellingUnit: "unit",
  unitsPerPackage: "1",
  packageLabel: "عبوة 500 مل",
  price: "",
  imageUrl: "",
  imageFile: null,
  imagePreviewUrl: "",
  description: "",
  deliveryEstimate: "خلال ساعة",
  isAvailable: true,
  stockQuantity: "0",
  minOrderQuantity: "1",
  maxOrderQuantity: "",
  trackInventory: true,
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
  { value: "pack", label: "باك", priceLabel: "للباك" },
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

function productErrorSummary(error) {
  if (!error) return {};
  return {
    stage: error.productSaveStage,
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  };
}

function warnProductStage(stage, error) {
  if (import.meta.env.DEV) {
    console.warn(`Product save failed at ${stage}:`, productErrorSummary(error));
  }
}

function productSaveMessage(error) {
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  if (error?.productSaveStage?.startsWith("image_upload")) {
    return "تعذر رفع صورة المنتج. جرّب صورة أصغر أو نوع JPG/PNG.";
  }
  if (error?.code === "22P02" || message.includes("invalid input syntax")) {
    return "تأكد من إدخال حجم المنتج باللتر كرقم مثل 0.02 أو 0.5 أو 1.5.";
  }
  if (message.includes("products_volume_liters_check")) {
    return "حجم المنتج باللتر يجب أن يكون أكبر من صفر.";
  }
  if (message.includes("products_order_quantity_range")) {
    return "أقصى كمية للطلب يجب أن تكون أكبر من أو مساوية لأقل كمية.";
  }
  if (
    message.includes("products_price_check") ||
    message.includes("products_stock_quantity_non_negative") ||
    message.includes("products_min_order_quantity_positive") ||
    message.includes("products_max_order_quantity_positive")
  ) {
    return "تأكد من أن السعر والحجم والكمية أكبر من صفر.";
  }

  return PRODUCT_SAVE_ERROR;
}

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
  const normalizedCategory = normalizeProductCategory(category);
  return CATEGORY_OPTIONS.find((option) => option.value === normalizedCategory)?.label ?? "تصنيف غير محدد";
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
  return product.packageLabel || product.sizeLabel || product.volumeLiters || "-";
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
  const unitVolume = product.unitVolumeLiters ?? product.volumeLiters;
  const unitsPerPackage = product.unitsPerPackage ?? 1;
  const matchedSize = findSizeOption(product.sizeLabel, unitVolume);

  return {
    nameAr: product.nameAr || "",
    nameEn: product.nameEn || "",
    category: normalizeProductCategory(product.category),
    waterType: product.waterType || "مياه شرب / مياه معبأة",
    sizeOption: matchedSize.value,
    sizeLabel: product.sizeLabel || product.packageLabel || "",
    volumeLiters: product.volumeLiters || totalVolumeLiters(unitVolume, unitsPerPackage),
    unitVolumeLiters: unitVolume || "",
    sellingUnit: product.sellingUnit || "unit",
    unitsPerPackage,
    packageLabel: product.packageLabel || product.sizeLabel || buildPackageLabel(unitVolume, product.sellingUnit || "unit", unitsPerPackage),
    price: product.price || "",
    imageUrl: product.imageUrl || "",
    imageFile: null,
    imagePreviewUrl: product.imageUrl || "",
    description: product.description || "",
    deliveryEstimate: product.deliveryEstimate || "",
    isAvailable: Boolean(product.isAvailable),
    stockQuantity: product.stockQuantity ?? "0",
    minOrderQuantity: product.minOrderQuantity ?? "1",
    maxOrderQuantity: product.maxOrderQuantity ?? "",
    trackInventory: product.trackInventory ?? true,
  };
}

function normalizeProductCategory(category) {
  const legacyMap = {
    bottled_water: "water_bottles",
    cartons: "water_gallons",
    tanker: "water_tankers",
    scheduled_delivery: "water_bottles",
  };
  const normalizedCategory = legacyMap[category] ?? category;
  return CATEGORY_OPTIONS.some((option) => option.value === normalizedCategory) ? normalizedCategory : "water_bottles";
}

function findSizeOption(sizeLabel, volumeLiters) {
  const volume = volumeLiters === null || volumeLiters === undefined ? "" : String(Number(volumeLiters));
  const matched = SIZE_OPTIONS.find((option) => {
    if (option.value === "custom") return false;
    return option.label === sizeLabel || String(Number(option.volumeLiters)) === volume;
  });

  return matched ?? { value: "custom" };
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
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (["unitVolumeLiters", "sellingUnit", "unitsPerPackage"].includes(field)) {
        next.volumeLiters = totalVolumeLiters(next.unitVolumeLiters, next.unitsPerPackage);
        next.packageLabel = buildPackageLabel(next.unitVolumeLiters, next.sellingUnit, next.unitsPerPackage);
        next.sizeLabel = next.packageLabel;
      }
      return next;
    });
  }

  function updateSizeOption(value) {
    const selectedSize = SIZE_OPTIONS.find((option) => option.value === value);

    setForm((current) => ({
      ...current,
      sizeOption: value,
      unitVolumeLiters: selectedSize && selectedSize.value !== "custom" ? selectedSize.volumeLiters : "",
      volumeLiters:
        selectedSize && selectedSize.value !== "custom"
          ? totalVolumeLiters(selectedSize.volumeLiters, current.unitsPerPackage)
          : "",
      packageLabel:
        selectedSize && selectedSize.value !== "custom"
          ? buildPackageLabel(selectedSize.volumeLiters, current.sellingUnit, current.unitsPerPackage)
          : "",
      sizeLabel:
        selectedSize && selectedSize.value !== "custom"
          ? buildPackageLabel(selectedSize.volumeLiters, current.sellingUnit, current.unitsPerPackage)
          : "",
    }));
  }

  function updateImageFile(file) {
    setErrorMessage("");

    if (!file) {
      setForm((current) => ({ ...current, imageFile: null, imagePreviewUrl: current.imageUrl || "" }));
      return;
    }

    const validationError = validateProductImageFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setForm((current) => ({ ...current, imageFile: null, imagePreviewUrl: current.imageUrl || "" }));
      return;
    }

    setForm((current) => ({
      ...current,
      imageFile: file,
      imagePreviewUrl: URL.createObjectURL(file),
    }));
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
    if (!CATEGORY_OPTIONS.some((option) => option.value === form.category)) return "يرجى اختيار التصنيف من القائمة.";
    if (!isValidWaterType(form.waterType)) return "يرجى اختيار نوع المياه من القائمة.";
    if (!SIZE_OPTIONS.some((option) => option.value === form.sizeOption)) return "يرجى اختيار الحجم من القائمة.";
    if (!SELLING_UNIT_OPTIONS.some((option) => option.value === form.sellingUnit)) return "يرجى اختيار وحدة البيع من القائمة.";
    const unitVolume = Number(form.unitVolumeLiters);
    if (!Number.isFinite(unitVolume) || unitVolume <= 0) return "يرجى إدخال حجم الوحدة الواحدة باللتر كرقم أكبر من صفر.";
    const unitsPerPackage = Number(form.unitsPerPackage);
    if (!Number.isInteger(unitsPerPackage) || unitsPerPackage <= 0) return "يرجى إدخال عدد وحدات صحيح داخل وحدة البيع.";
    if (!form.packageLabel.trim()) return "يرجى تحديد وصف وحدة البيع.";

    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) return "يرجى إدخال سعر صحيح أكبر من صفر.";

    const volume = Number(form.volumeLiters);
    if (!Number.isFinite(volume) || volume <= 0) return "يرجى إدخال حجم صحيح باللتر.";
    if (!DELIVERY_OPTIONS.includes(form.deliveryEstimate)) return "يرجى اختيار مدة التوصيل من القائمة.";
    const stockQuantity = Number(form.stockQuantity);
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) return "يرجى إدخال كمية مخزون صحيحة لا تقل عن صفر.";
    const minOrderQuantity = Number(form.minOrderQuantity);
    if (!Number.isInteger(minOrderQuantity) || minOrderQuantity <= 0) return "يرجى إدخال حد أدنى صحيح للطلب.";
    if (form.maxOrderQuantity) {
      const maxOrderQuantity = Number(form.maxOrderQuantity);
      if (!Number.isInteger(maxOrderQuantity) || maxOrderQuantity <= 0) return "يرجى إدخال حد أقصى صحيح للطلب.";
      if (maxOrderQuantity < minOrderQuantity) return "الحد الأقصى للطلب يجب أن يكون أكبر من أو يساوي الحد الأدنى.";
    }

    return "";
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const validationError = validateForm();
    if (validationError) {
      warnProductStage("validation", new Error(validationError));
      setErrorMessage(validationError);
      return;
    }

    const payload = {
      ...form,
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim(),
      category: form.category.trim(),
      waterType: form.waterType.trim(),
      sizeLabel: form.packageLabel.trim(),
      volumeLiters: form.volumeLiters,
      unitVolumeLiters: form.unitVolumeLiters,
      sellingUnit: form.sellingUnit,
      unitsPerPackage: form.unitsPerPackage,
      packageLabel: form.packageLabel.trim(),
      price: form.price,
      imageUrl: form.imageUrl.trim(),
      imageFile: form.imageFile,
      description: form.description.trim(),
      deliveryEstimate: form.deliveryEstimate.trim(),
      stockQuantity: form.stockQuantity,
      minOrderQuantity: form.minOrderQuantity,
      maxOrderQuantity: form.maxOrderQuantity,
      trackInventory: form.trackInventory,
    };

    setIsSaving(true);
    try {
      if (editingProductId) {
        const updatedProduct = await updateCompanyProductForReview(companyId, editingProductId, payload);
        try {
          setProducts((current) => current.map((product) => (product.id === editingProductId ? updatedProduct : product)));
        } catch (error) {
          error.productSaveStage = "state_update";
          warnProductStage("state_update", error);
          throw error;
        }
        setMessage("تم تحديث المنتج وإرساله للمراجعة من إدارة فلج.");
      } else {
        const createdProduct = await createCompanyProductForReview(companyId, payload);
        try {
          setProducts((current) => [createdProduct, ...current]);
        } catch (error) {
          error.productSaveStage = "state_update";
          warnProductStage("state_update", error);
          throw error;
        }
        setMessage("تم إرسال المنتج للمراجعة من إدارة فلج.");
      }

      closeForm();
    } catch (error) {
      warnProductStage(error.productSaveStage || "save_product", error);
      setErrorMessage(productSaveMessage(error));
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
            onSizeOptionChange={updateSizeOption}
            onImageChange={updateImageFile}
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

function ProductForm({ form, isSaving, isEditing, onChange, onSizeOptionChange, onImageChange, onCancel, onSubmit }) {
  const isCustomSize = form.sizeOption === "custom";

  return (
    <form className="product-form" onSubmit={onSubmit}>
      <fieldset className="product-form-section product-form-wide">
        <legend>معلومات المنتج</legend>
        <div className="product-form-section-grid">
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
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            نوع المياه
            <select value={form.waterType} onChange={(event) => onChange("waterType", event.target.value)} required>
              {waterTypeOptionsForValue(form.waterType).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="product-form-section product-form-wide">
        <legend>وحدة البيع والسعر</legend>
        <div className="product-form-section-grid">
          <label>
            حجم الوحدة الواحدة
            <select value={form.sizeOption} onChange={(event) => onSizeOptionChange(event.target.value)}>
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
              value={form.unitVolumeLiters}
              onChange={(event) => onChange("unitVolumeLiters", event.target.value)}
              readOnly={!isCustomSize}
              required
            />
          </label>

          <label>
            وحدة البيع
            <select value={form.sellingUnit} onChange={(event) => onChange("sellingUnit", event.target.value)}>
              {SELLING_UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            عدد الوحدات داخل البيع
            <input
              type="number"
              min="1"
              step="1"
              value={form.unitsPerPackage}
              onChange={(event) => onChange("unitsPerPackage", event.target.value)}
              required
            />
          </label>

          <label>
            وصف وحدة البيع
            <input value={form.packageLabel} onChange={(event) => onChange("packageLabel", event.target.value)} required />
          </label>

          <label>
            إجمالي اللترات لوحدة البيع
            <input type="number" min="0" step="0.001" value={form.volumeLiters} readOnly required />
          </label>

          <label>
            سعر وحدة البيع
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={form.price}
              onChange={(event) => onChange("price", event.target.value)}
              required
            />
            <small>السعر هو {sellingUnitPriceLabel(form.sellingUnit)} كاملًا، وليس سعر اللتر.</small>
          </label>
        </div>
      </fieldset>

      <fieldset className="product-form-section product-form-wide">
        <legend>الصورة</legend>
        <label>
          صورة المنتج
          <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(event) => onImageChange(event.target.files?.[0] ?? null)} />
          <small>JPG أو PNG أو WebP، بحد أقصى 3MB. يمكن حفظ المنتج بدون صورة.</small>
        </label>

        {form.imagePreviewUrl ? (
          <div className="product-image-preview">
            <img src={form.imagePreviewUrl} alt="معاينة صورة المنتج" />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="product-form-section product-form-wide">
        <legend>التوفر والتوصيل</legend>
        <div className="product-form-section-grid">
          <label>
            مدة التوصيل
            <select value={form.deliveryEstimate} onChange={(event) => onChange("deliveryEstimate", event.target.value)}>
              {DELIVERY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            التوفر
            <select value={form.isAvailable ? "available" : "unavailable"} onChange={(event) => onChange("isAvailable", event.target.value === "available")}>
              <option value="available">متوفر</option>
              <option value="unavailable">غير متوفر</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="product-form-section product-form-wide">
        <legend>المخزون والطلبات</legend>
        <div className="product-form-section-grid">
          <label>
            كمية المخزون
            <input
              type="number"
              min="0"
              step="1"
              value={form.stockQuantity}
              onChange={(event) => onChange("stockQuantity", event.target.value)}
            />
          </label>
          <label>
            الحد الأدنى للطلب
            <input
              type="number"
              min="1"
              step="1"
              value={form.minOrderQuantity}
              onChange={(event) => onChange("minOrderQuantity", event.target.value)}
            />
          </label>
          <label>
            الحد الأقصى للطلب
            <input
              type="number"
              min="1"
              step="1"
              value={form.maxOrderQuantity}
              onChange={(event) => onChange("maxOrderQuantity", event.target.value)}
              placeholder="اختياري"
            />
          </label>
          <label>
            تتبع المخزون
            <select value={form.trackInventory ? "track" : "no-track"} onChange={(event) => onChange("trackInventory", event.target.value === "track")}>
              <option value="track">مفعل</option>
              <option value="no-track">غير مفعل</option>
            </select>
          </label>
        </div>
        <small className="muted-text">TODO: خصم المخزون يجب أن يكون atomic لاحقًا أثناء إنشاء الطلب الحقيقي.</small>
      </fieldset>

      <fieldset className="product-form-section product-form-wide">
        <legend>الوصف</legend>
        <label>
          الوصف
          <textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} rows={4} />
        </label>
      </fieldset>

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
            <dt>وحدة البيع</dt>
            <dd>{productPackageLabel(product)}</dd>
          </div>
          <div>
            <dt>سعر وحدة البيع</dt>
            <dd>{formatPrice(product.price)} {sellingUnitPriceLabel(product.sellingUnit)}</dd>
          </div>
          <div>
            <dt>إجمالي اللترات</dt>
            <dd>{product.volumeLiters ? `${Number(product.volumeLiters).toFixed(3)} لتر` : "-"}</dd>
          </div>
          <div>
            <dt>المخزون</dt>
            <dd>{product.trackInventory ? `${product.stockQuantity ?? 0}` : "غير متتبع"}</dd>
          </div>
          <div>
            <dt>حد الطلب</dt>
            <dd>
              {product.minOrderQuantity || 1}
              {product.maxOrderQuantity ? ` - ${product.maxOrderQuantity}` : "+"}
            </dd>
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
