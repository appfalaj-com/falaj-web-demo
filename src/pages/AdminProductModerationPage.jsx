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

export default function AdminProductModerationPage() {
  const [products, setProducts] = useState([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingProductId, setReviewingProductId] = useState(null);
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
          <div className="table-wrap">
            <table className="falaj-table">
              <thead>
                <tr>
                  <th>المورد</th>
                  <th>المنتج</th>
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
                    <td>{formatPrice(product.price)}</td>
                    <td>
                      {product.image_url ? (
                        <button type="button" className="ghost" onClick={() => setSelectedImage(product.image_url)}>
                          عرض الصورة
                        </button>
                      ) : (
                        "-"
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
        )}
      </section>

      {selectedImage ? (
        <div className="details-backdrop" role="presentation" onClick={() => setSelectedImage(null)}>
          <aside className="details-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="details-header">
              <h2>صورة المنتج</h2>
              <button type="button" className="ghost close-button" onClick={() => setSelectedImage(null)}>
                إغلاق
              </button>
            </div>
            <img src={selectedImage} alt="صورة المنتج" className="product-image" />
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
    "price",
    "image_url",
    "description",
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
