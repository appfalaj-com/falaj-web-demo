import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import { supabase } from "../lib/supabaseClient.js";

const ZERO_METRICS = {
  totalSuppliers: 0,
  approvedSuppliers: 0,
  pendingJoinRequests: 0,
  todayOrders: 0,
  totalDrivers: 0,
  todaySales: 0,
  todayCommission: 0,
  activeDeliveries: 0,
  failedOrders: 0,
};

export default function AdminPage({ onNavigate }) {
  const [metrics, setMetrics] = useState(ZERO_METRICS);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      setErrorMessage("");

      try {
        const nextMetrics = await getAdminMetricsFromSupabase();
        if (!cancelled) setMetrics(nextMetrics);
      } catch (error) {
        if (!cancelled) {
          setMetrics(ZERO_METRICS);
          setErrorMessage(error.message || "تعذر تحميل مؤشرات لوحة الإدارة من قاعدة البيانات.");
        }
      }
    }

    loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الإدارة</p>
          <h1>لوحة تحكم فلج</h1>
        </div>
      </header>

      {errorMessage ? (
        <p className="auth-alert error">تعذر تحميل مؤشرات لوحة الإدارة من قاعدة البيانات.</p>
      ) : null}

      <section className="admin-supplier-requests-card">
        <div>
          <p className="eyebrow">طلبات الموردين</p>
          <h2>طلبات انضمام الموردين</h2>
          <p>مراجعة طلبات الشركات الراغبة بالانضمام إلى فلج</p>
        </div>
        <strong className="admin-supplier-requests-count">{metrics.pendingJoinRequests}</strong>
        <button type="button" onClick={() => onNavigate?.("/admin/supplier-requests")}>
          فتح الطلبات
        </button>
      </section>

      <section className="metrics-grid admin-metrics-grid">
        <MetricCard label="إجمالي الموردين" value={metrics.totalSuppliers} tone="primary" />
        <MetricCard label="موردون مفعلون" value={metrics.approvedSuppliers} tone="primary" />
        <MetricCard label="طلبات الانضمام" value={metrics.pendingJoinRequests} tone="cash" />
        <MetricCard label="طلبات اليوم" value={metrics.todayOrders} />
        <MetricCard label="إجمالي السائقين" value={metrics.totalDrivers} />
        <MetricCard label="مبيعات اليوم" value={formatMoney(metrics.todaySales)} />
        <MetricCard label="عمولة فلج اليوم" value={formatMoney(metrics.todayCommission)} />
        <MetricCard label="طلبات قيد التوصيل" value={metrics.activeDeliveries} />
        <MetricCard label="طلبات متعثرة" value={metrics.failedOrders} />
      </section>

      <section className="panel overview admin-actions-panel">
        <h2>مراكز الإدارة</h2>
        <div className="admin-action-grid">
          <button type="button" onClick={() => onNavigate?.("/admin/suppliers")}>
            إدارة الموردين
          </button>
          <button type="button" onClick={() => onNavigate?.("/admin/supplier-requests")}>
            طلبات انضمام الموردين
          </button>
          <button type="button" onClick={() => onNavigate?.("/admin/product-moderation")}>
            مراجعة الكتالوج
          </button>
          <button type="button" onClick={() => onNavigate?.("/admin/finance")}>
            المالية والتسويات
          </button>
          <button type="button" onClick={() => onNavigate?.("/admin/live-tracking")}>
            التتبع العام
          </button>
        </div>
      </section>
    </div>
  );
}

async function getAdminMetricsFromSupabase() {
  if (!supabase) {
    throw new Error("Supabase غير مفعّل حاليًا.");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [
    totalSuppliers,
    approvedSuppliers,
    pendingJoinRequests,
    todayOrders,
    totalDrivers,
    activeDeliveries,
    failedOrders,
    financialRows,
  ] = await Promise.all([
    safeAdminMetric("companies total", 0, () => countRows("companies")),
    safeAdminMetric("companies active", 0, () => countRows("companies", (query) => query.eq("is_active", true))),
    safeAdminMetric("supplier join requests pending", 0, () =>
      countRows("supplier_join_requests", (query) => query.in("status", ["pending", "new"]))
    ),
    safeAdminMetric("orders today", 0, () => countRows("orders", (query) => query.gte("created_at", todayIso))),
    safeAdminMetric("drivers total", 0, () => countRows("drivers")),
    safeAdminMetric("orders active deliveries", 0, () =>
      countRows("orders", (query) => query.in("status", ["accepted", "assigned", "en_route", "arrived"]))
    ),
    safeAdminMetric("orders failed", 0, () => countRows("orders", (query) => query.eq("status", "failed"))),
    safeAdminMetric("order financials today", [], () => getTodayFinancialRows(todayIso)),
  ]);

  return {
    totalSuppliers,
    approvedSuppliers,
    pendingJoinRequests,
    todayOrders,
    totalDrivers,
    activeDeliveries,
    failedOrders,
    todaySales: financialRows.reduce((sum, row) => sum + Number(row.gross_amount || 0), 0),
    todayCommission: financialRows.reduce((sum, row) => sum + Number(row.falaj_commission_amount || 0), 0),
  };
}

async function safeAdminMetric(label, fallbackValue, loadMetric) {
  try {
    return await loadMetric();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`Admin dashboard metric failed: ${label}`, error);
    }
    return fallbackValue;
  }
}

async function countRows(tableName, applyFilters = (query) => query) {
  const query = applyFilters(supabase.from(tableName).select("id", { count: "exact", head: true }));
  const { count, error } = await query;

  if (error) throw error;
  return count ?? 0;
}

async function getTodayFinancialRows(todayIso) {
  const { data, error } = await supabase
    .from("order_financials")
    .select("gross_amount, falaj_commission_amount")
    .gte("created_at", todayIso);

  if (error) throw error;
  return data ?? [];
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}
