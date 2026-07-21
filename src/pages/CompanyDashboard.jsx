import { useEffect, useMemo, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import { updateCompanyLogo, validateCompanyLogoFile } from "../services/companyAuthService.js";
import { getDriversByCompanyFromSupabase } from "../services/driverService.js";
import { getOrdersByCompanyFromSupabase } from "../services/orderService.js";
import { getProductsByCompanyFromSupabase } from "../services/productService.js";

const PRODUCT_STATUS_LABELS = {
  pending_review: "قيد المراجعة",
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

const ACTIVE_ORDER_STATUSES = ["active", "accepted", "assigned", "en_route", "arrived"];
const DASHBOARD_LOAD_ERROR = "تعذر تحميل ملخص لوحة المورد من قاعدة البيانات. حاول التحديث مرة أخرى.";
const DASHBOARD_SECTION_LABELS = {
  products: "المنتجات",
  orders: "الطلبات",
  drivers: "السائقين",
};

export default function CompanyDashboard({ companyId, company, onCompanyUpdated, onNavigate }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [logoMessage, setLogoMessage] = useState("");
  const [logoError, setLogoError] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const results = await Promise.allSettled([
          getProductsByCompanyFromSupabase(companyId),
          getOrdersByCompanyFromSupabase(companyId),
          getDriversByCompanyFromSupabase(companyId),
        ]);

        if (!cancelled) {
          const [productsResult, ordersResult, driversResult] = results;
          const failedSections = [
            productsResult.status === "rejected" ? "products" : null,
            ordersResult.status === "rejected" ? "orders" : null,
            driversResult.status === "rejected" ? "drivers" : null,
          ].filter(Boolean);

          setProducts(productsResult.status === "fulfilled" ? productsResult.value : []);
          setOrders(ordersResult.status === "fulfilled" ? ordersResult.value : []);
          setDrivers(driversResult.status === "fulfilled" ? driversResult.value : []);
          setErrorMessage(getDashboardErrorMessage(failedSections));

          if (failedSections.length > 0) {
            console.warn("Company dashboard partial load failure", summarizeDashboardFailures(results));
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (companyId) {
      loadDashboard();
    } else {
      setIsLoading(false);
      setErrorMessage("تعذر تحديد الشركة الحالية.");
    }

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const productSummary = useMemo(() => summarizeProducts(products), [products]);
  const orderSummary = useMemo(() => summarizeOrders(orders), [orders]);
  const latestProducts = [...products]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);
  const latestOrders = orders.slice(0, 5);
  const isCompanyActive = Boolean(company?.is_active);
  const onboardingStatus = company?.onboarding_status || "pending_setup";

  function handleLogoFileChange(file) {
    setLogoMessage("");
    setLogoError("");

    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);

    if (!file) {
      setLogoFile(null);
      setLogoPreviewUrl("");
      return;
    }

    const validationError = validateCompanyLogoFile(file);
    if (validationError) {
      setLogoFile(null);
      setLogoPreviewUrl("");
      setLogoError(validationError);
      return;
    }

    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  }

  async function handleLogoUpload(event) {
    event.preventDefault();
    setLogoMessage("");
    setLogoError("");

    if (!logoFile) {
      setLogoError("اختر شعار الشركة أولًا.");
      return;
    }

    try {
      setIsUploadingLogo(true);
      const updatedCompany = await updateCompanyLogo(companyId, logoFile);
      onCompanyUpdated?.(updatedCompany);
      setLogoFile(null);
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl("");
      setLogoMessage("تم تحديث شعار الشركة بنجاح.");
    } catch (error) {
      setLogoError("تعذر رفع شعار الشركة. تأكد من نوع الصورة وحاول مرة أخرى.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">لوحة المورد</p>
          <h1>{company?.name || "شركة المياه"}</h1>
          <p>ملخص حساب الشركة ومنتجاتها وطلباتها وسائقيها من Supabase.</p>
        </div>
      </header>

      {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}

      <section className="cards-grid supplier-detail-grid">
        <article className="driver-card">
          <h2>حالة الشركة</h2>
          <dl>
            <div>
              <dt>الحالة</dt>
              <dd>
                <span className={`status ${isCompanyActive ? "active" : "inactive"}`}>
                  {isCompanyActive ? "نشط" : "غير نشط"}
                </span>
              </dd>
            </div>
            <div>
              <dt>مرحلة الحساب</dt>
              <dd>
                <span className={`status ${onboardingStatus}`}>
                  {ONBOARDING_LABELS[onboardingStatus] || onboardingStatus}
                </span>
              </dd>
            </div>
            <div>
              <dt>تاريخ الإنشاء</dt>
              <dd>{formatDate(company?.created_at)}</dd>
            </div>
          </dl>
        </article>

        <article className="driver-card company-logo-card">
          <h2>شعار الشركة</h2>
          <p>يظهر هذا الشعار للعملاء في تطبيق فلج عند عرض المورد ومنتجاته.</p>
          <div className="company-logo-preview">
            {logoPreviewUrl || company?.logo_url ? (
              <img src={logoPreviewUrl || company.logo_url} alt="شعار الشركة" />
            ) : (
              <span>لا يوجد شعار</span>
            )}
          </div>
          <form className="company-logo-form" onSubmit={handleLogoUpload}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleLogoFileChange(event.target.files?.[0] ?? null)}
            />
            <button type="submit" disabled={!logoFile || isUploadingLogo}>
              {isUploadingLogo ? "جاري الرفع..." : "حفظ الشعار"}
            </button>
          </form>
          {logoMessage ? <p className="auth-alert success">{logoMessage}</p> : null}
          {logoError ? <p className="auth-alert error">{logoError}</p> : null}
        </article>

        <article className="driver-card company-quick-links">
          <h2>روابط سريعة</h2>
          <div className="row-actions">
            <button type="button" onClick={() => onNavigate?.("/company/products")}>إدارة المنتجات</button>
            <button type="button" className="ghost" onClick={() => onNavigate?.("/company/orders")}>الطلبات</button>
            <button type="button" className="ghost" onClick={() => onNavigate?.("/company/drivers")}>السائقون</button>
            <button type="button" className="ghost" onClick={() => onNavigate?.("/company/drivers/live")}>التتبع المباشر</button>
          </div>
        </article>
      </section>

      <CompanyAlerts
        isCompanyActive={isCompanyActive}
        productSummary={productSummary}
        onNavigate={onNavigate}
      />

      <section className="metrics-grid">
        <MetricCard label="إجمالي المنتجات" value={productSummary.total} tone="primary" />
        <MetricCard label="قيد المراجعة" value={productSummary.pending} />
        <MetricCard label="معتمدة" value={productSummary.approved} tone="cash" />
        <MetricCard label="مرفوضة" value={productSummary.rejected} />
        <MetricCard label="ظاهرة للعملاء" value={productSummary.visible} tone="primary" />
        <MetricCard label="إجمالي الطلبات" value={orders.length} />
        <MetricCard label="طلبات جديدة" value={orderSummary.pending} />
        <MetricCard label="قيد التنفيذ" value={orderSummary.active} />
        <MetricCard label="السائقون" value={drivers.length} />
      </section>

      {isLoading ? (
        <section className="panel">
          <p className="empty-state">جاري تحميل ملخص لوحة المورد...</p>
        </section>
      ) : (
        <section className="cards-grid supplier-detail-grid">
          <LatestProducts products={latestProducts} onNavigate={onNavigate} />
          <LatestOrders orders={latestOrders} onNavigate={onNavigate} />
        </section>
      )}
    </div>
  );
}

function CompanyAlerts({ isCompanyActive, productSummary, onNavigate }) {
  const alerts = [];

  if (!isCompanyActive) {
    alerts.push({
      tone: "warning",
      message: "حساب الشركة غير مفعّل حاليًا، ولن تظهر المنتجات للعملاء قبل التفعيل.",
    });
  }

  if (productSummary.total === 0) {
    alerts.push({
      tone: "info",
      message: "ابدأ بإضافة أول منتج ليتم مراجعته من إدارة فلج.",
      action: "إضافة منتج",
      path: "/company/products",
    });
  }

  if (productSummary.pending > 0) {
    alerts.push({
      tone: "info",
      message: "لديك منتجات قيد مراجعة الإدارة.",
    });
  }

  if (productSummary.rejected > 0) {
    alerts.push({
      tone: "warning",
      message: "بعض المنتجات تحتاج تعديل أو مراجعة.",
      action: "مراجعة المنتجات",
      path: "/company/products",
    });
  }

  if (alerts.length === 0) return null;

  return (
    <section className="company-alerts">
      {alerts.map((alert) => (
        <article className={`company-alert ${alert.tone}`} key={alert.message}>
          <p>{alert.message}</p>
          {alert.action ? (
            <button type="button" className="ghost" onClick={() => onNavigate?.(alert.path)}>
              {alert.action}
            </button>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function LatestProducts({ products, onNavigate }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>آخر المنتجات</h2>
          <p>آخر خمسة منتجات أضيفت من لوحة المورد.</p>
        </div>
        <button type="button" className="ghost" onClick={() => onNavigate?.("/company/products")}>كل المنتجات</button>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <strong>لا توجد منتجات حتى الآن</strong>
          <span>ستظهر هنا المنتجات بعد إضافتها وإرسالها للمراجعة.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="falaj-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>السعر</th>
                <th>حالة المراجعة</th>
                <th>ظاهر</th>
                <th>متوفر</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.nameAr || product.nameEn || "-"}</td>
                  <td>{formatMoney(product.price)}</td>
                  <td>
                    <span className={`status ${normalizeProductStatus(product.approvalStatus)}`}>
                      {productStatusLabel(product.approvalStatus)}
                    </span>
                  </td>
                  <td>{product.isVisible ? "نعم" : "لا"}</td>
                  <td>{product.isAvailable ? "نعم" : "لا"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LatestOrders({ orders, onNavigate }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>آخر الطلبات</h2>
          <p>آخر خمسة طلبات مرتبطة بالشركة.</p>
        </div>
        <button type="button" className="ghost" onClick={() => onNavigate?.("/company/orders")}>كل الطلبات</button>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <strong>لا توجد طلبات حالية</strong>
          <span>ستظهر هنا طلبات العملاء الجديدة عند وصولها.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="falaj-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>العميل</th>
                <th>الحالة</th>
                <th>القيمة</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id || "-"}</td>
                  <td>{order.customer || "-"}</td>
                  <td><span className={`status ${order.status}`}>{order.status || "-"}</span></td>
                  <td>{formatMoney(order.amount)}</td>
                  <td>{order.time || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function summarizeProducts(products) {
  return products.reduce(
    (summary, product) => {
      const status = normalizeProductStatus(product.approvalStatus);
      summary.total += 1;
      if (status === "pending_review") summary.pending += 1;
      if (status === "approved") summary.approved += 1;
      if (status === "rejected") summary.rejected += 1;
      if (product.isVisible) summary.visible += 1;
      return summary;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0, visible: 0 }
  );
}

function summarizeOrders(orders) {
  return orders.reduce(
    (summary, order) => {
      if (order.status === "pending") summary.pending += 1;
      if (ACTIVE_ORDER_STATUSES.includes(order.status)) summary.active += 1;
      return summary;
    },
    { pending: 0, active: 0 }
  );
}

function getDashboardErrorMessage(failedSections) {
  if (failedSections.length === 0) return "";
  if (failedSections.length === Object.keys(DASHBOARD_SECTION_LABELS).length) return DASHBOARD_LOAD_ERROR;

  const sectionNames = failedSections.map((section) => DASHBOARD_SECTION_LABELS[section]).join("، ");
  return `تعذر تحميل بيانات ${sectionNames}. باقي ملخص اللوحة تم تحميله بنجاح.`;
}

function summarizeDashboardFailures(results) {
  return results.map((result, index) => {
    const section = ["products", "orders", "drivers"][index];
    if (result.status === "fulfilled") {
      return { section, ok: true, count: result.value?.length ?? 0 };
    }

    return {
      section,
      ok: false,
      message: result.reason?.message,
      code: result.reason?.code,
      details: result.reason?.details,
      hint: result.reason?.hint,
    };
  });
}

function normalizeProductStatus(status) {
  return status || "pending_review";
}

function productStatusLabel(status) {
  return PRODUCT_STATUS_LABELS[normalizeProductStatus(status)] ?? "قيد المراجعة";
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-OM");
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}
