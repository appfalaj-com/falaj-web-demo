import { useEffect, useMemo, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import { supabase } from "../lib/supabaseClient.js";

const PRODUCT_STATUS_LABELS = {
  pending_review: "بانتظار المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  hidden: "مخفي",
};

const ONBOARDING_LABELS = {
  pending_setup: "قيد الإعداد",
  pending_activation: "بانتظار التفعيل",
  company_created: "تم إنشاء ملف المورد",
  invitation_sent: "تم إرسال الدعوة",
  activated: "مفعل",
  rejected: "مرفوض",
  suspended: "موقوف",
};

export default function AdminSupplierAccountPage({ companyId, onNavigate }) {
  const [company, setCompany] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSupplierDetails() {
      setIsLoading(true);
      setErrorMessage("");
      setMessage("");

      try {
        const details = await fetchSupplierDetails(companyId);
        if (!cancelled) {
          setCompany(details.company);
          setProducts(details.products);
          setOrders(details.orders);
          setDrivers(details.drivers);
        }
      } catch (error) {
        if (!cancelled) {
          setCompany(null);
          setProducts([]);
          setOrders([]);
          setDrivers([]);
          setErrorMessage(error.message || "تعذر تحميل بيانات المورد من قاعدة البيانات.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSupplierDetails();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const productSummary = useMemo(() => summarizeProducts(products), [products]);

  async function updateCompanyActiveState(nextIsActive) {
    setMessage("");
    setErrorMessage("");
    setIsUpdating(true);

    try {
      const updatedCompany = await updateSupplierActiveState(companyId, nextIsActive);
      setCompany(updatedCompany);
      setMessage(nextIsActive ? "تم تفعيل المورد بنجاح." : "تم إيقاف المورد بنجاح.");
    } catch (error) {
      setErrorMessage(error.message || "تعذر تحديث حالة المورد.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">تفاصيل المورد</p>
          <h1>{company?.name || "مورد غير محدد"}</h1>
          <p>عرض بيانات المورد المعتمد ومنتجاته ومؤشرات التشغيل من قاعدة البيانات فقط.</p>
        </div>
        <div className="row-actions">
          <button type="button" className="ghost" onClick={() => onNavigate?.("/admin/suppliers")}>
            العودة للموردين
          </button>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/admin/product-moderation")}>
            مراجعة الكتالوج
          </button>
        </div>
      </header>

      {message ? <p className="auth-alert success">{message}</p> : null}
      {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}

      {isLoading ? (
        <section className="panel">
          <p className="empty-state">جاري تحميل بيانات المورد...</p>
        </section>
      ) : !company ? (
        <section className="panel">
          <div className="empty-state">
            <strong>لم يتم العثور على المورد</strong>
            <span>تأكد من رابط المورد أو ارجع إلى قائمة الموردين.</span>
          </div>
        </section>
      ) : (
        <>
          <section className="cards-grid supplier-detail-grid">
            <SupplierInfo
              title="بيانات الشركة"
              rows={[
                ["الاسم", company.name],
                ["البريد", company.email],
                ["الهاتف", company.phone],
                ["تاريخ الإنشاء", formatDate(company.created_at)],
              ]}
            />
            <SupplierInfo
              title="حالة المورد"
              rows={[
                ["الحالة", <StatusBadge key="active" value={company.is_active ? "active" : "inactive"} label={company.is_active ? "نشط" : "غير نشط"} />],
                [
                  "مرحلة الانضمام",
                  <StatusBadge
                    key="onboarding"
                    value={company.onboarding_status || "pending"}
                    label={onboardingLabel(company.onboarding_status)}
                  />,
                ],
                ["Owner ID", company.owner_id],
              ]}
            />
            <SupplierInfo
              title="إجراءات آمنة"
              rows={[
                [
                  "تفعيل/إيقاف",
                  <button
                    key="toggle"
                    type="button"
                    className={company.is_active ? "ghost danger-action" : "primary-action"}
                    onClick={() => updateCompanyActiveState(!company.is_active)}
                    disabled={isUpdating}
                  >
                    {company.is_active ? "إيقاف المورد" : "تفعيل المورد"}
                  </button>,
                ],
                ["ملاحظة", "يتم تحديث is_active فقط بدون حذف أو تغيير owner_id."],
              ]}
            />
          </section>

          <section className="metrics-grid">
            <MetricCard label="إجمالي المنتجات" value={productSummary.total} tone="primary" />
            <MetricCard label="بانتظار المراجعة" value={productSummary.pending} />
            <MetricCard label="معتمدة" value={productSummary.approved} tone="cash" />
            <MetricCard label="مرفوضة" value={productSummary.rejected} />
            <MetricCard label="ظاهرة للعملاء" value={productSummary.visible} tone="primary" />
            <MetricCard label="الطلبات" value={orders.length} />
            <MetricCard label="السائقون" value={drivers.length} />
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>منتجات المورد</h2>
                <p>حالة الكتالوج كما تظهر في نظام مراجعة المنتجات.</p>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="empty-state">
                <strong>لا توجد منتجات</strong>
                <span>ستظهر هنا منتجات المورد بعد إضافتها من لوحة الشركة.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="falaj-table">
                  <thead>
                    <tr>
                      <th>اسم المنتج</th>
                      <th>السعر</th>
                      <th>الحجم/الوحدة</th>
                      <th>متوفر</th>
                      <th>ظاهر</th>
                      <th>حالة المراجعة</th>
                      <th>آخر تحديث</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name_ar || product.name_en || "-"}</td>
                        <td>{formatMoney(product.price)}</td>
                        <td>{product.size_label || product.volume_liters || "-"}</td>
                        <td>{product.is_available ? "نعم" : "لا"}</td>
                        <td>{product.is_visible ? "نعم" : "لا"}</td>
                        <td>
                          <StatusBadge
                            value={normalizeProductStatus(product.approval_status)}
                            label={productStatusLabel(product.approval_status)}
                          />
                        </td>
                        <td>{formatDate(product.updated_at || product.created_at)}</td>
                        <td>
                          <button type="button" className="ghost" onClick={() => onNavigate?.("/admin/product-moderation")}>
                            مراجعة
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="cards-grid supplier-detail-grid">
            <article className="driver-card">
              <h2>الطلبات</h2>
              {orders.length === 0 ? (
                <div className="empty-state compact-empty">
                  <strong>لا توجد طلبات</strong>
                  <span>ستظهر هنا طلبات المورد عند وصول طلبات حقيقية.</span>
                </div>
              ) : (
                <p>عدد الطلبات المرتبطة بهذا المورد: {orders.length}</p>
              )}
            </article>

            <article className="driver-card">
              <h2>السائقون</h2>
              {drivers.length === 0 ? (
                <div className="empty-state compact-empty">
                  <strong>لا يوجد سائقون</strong>
                  <span>ستظهر هنا بيانات السائقين بعد إضافتهم إلى الشركة.</span>
                </div>
              ) : (
                <p>عدد السائقين المرتبطين بهذا المورد: {drivers.length}</p>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}

async function fetchSupplierDetails(companyId) {
  if (!supabase) {
    throw new Error("Supabase غير مفعل حاليًا.");
  }

  const [companyResult, productsResult, ordersResult, driversResult] = await Promise.all([
    supabase
      .from("companies")
      .select("id, owner_id, name, phone, email, is_active, onboarding_status, created_at, updated_at")
      .eq("id", companyId)
      .single(),
    supabase
      .from("products")
      .select("id, name_ar, name_en, price, size_label, volume_liters, is_available, is_visible, approval_status, created_at, updated_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("orders").select("id, created_at").eq("company_id", companyId),
    supabase.from("drivers").select("id, created_at").eq("company_id", companyId),
  ]);

  if (companyResult.error) throw companyResult.error;
  if (productsResult.error) throw productsResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (driversResult.error) throw driversResult.error;

  return {
    company: companyResult.data,
    products: productsResult.data ?? [],
    orders: ordersResult.data ?? [],
    drivers: driversResult.data ?? [],
  };
}

async function updateSupplierActiveState(companyId, isActive) {
  if (!supabase) {
    throw new Error("Supabase غير مفعل حاليًا.");
  }

  const { data, error } = await supabase
    .from("companies")
    .update({ is_active: isActive })
    .eq("id", companyId)
    .select("id, owner_id, name, phone, email, is_active, onboarding_status, created_at, updated_at")
    .single();

  if (error) throw error;
  return data;
}

function summarizeProducts(products) {
  return products.reduce(
    (summary, product) => {
      const status = normalizeProductStatus(product.approval_status);
      summary.total += 1;
      if (status === "pending_review") summary.pending += 1;
      if (status === "approved") summary.approved += 1;
      if (status === "rejected") summary.rejected += 1;
      if (product.is_visible) summary.visible += 1;
      return summary;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0, visible: 0 }
  );
}

function SupplierInfo({ title, rows }) {
  return (
    <article className="driver-card">
      <h2>{title}</h2>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "-"}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function StatusBadge({ value, label }) {
  return <span className={`status ${value}`}>{label}</span>;
}

function normalizeProductStatus(status) {
  return status || "pending_review";
}

function productStatusLabel(status) {
  return PRODUCT_STATUS_LABELS[normalizeProductStatus(status)] ?? "بانتظار المراجعة";
}

function onboardingLabel(status) {
  return ONBOARDING_LABELS[status] ?? status ?? "غير محدد";
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-OM");
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}
