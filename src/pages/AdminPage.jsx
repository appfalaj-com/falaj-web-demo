import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import {
  getFinancialRows,
  getSuppliers,
  summarizeFinance,
} from "../services/adminFinanceService.js";
import { getAdminDashboardMetrics } from "../services/adminService.js";
import { supabase } from "../lib/supabaseClient.js";

export default function AdminPage({ orders, onNavigate }) {
  const [suppliers, setSuppliers] = useState([]);
  const [financialRows, setFinancialRows] = useState([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      try {
        const nextSuppliers = await getSuppliers();
        const nextFinancialRows = await getFinancialRows(orders, nextSuppliers);
        const nextPendingJoinRequests = await getPendingJoinRequestsCount();
        if (!cancelled) {
          setSuppliers(nextSuppliers);
          setFinancialRows(nextFinancialRows);
          setPendingJoinRequests(nextPendingJoinRequests);
        }
      } catch {
        if (!cancelled) {
          setSuppliers([]);
          setFinancialRows([]);
          setPendingJoinRequests(null);
        }
      }
    }

    loadAdminData();

    return () => {
      cancelled = true;
    };
  }, [orders]);

  const finance = summarizeFinance(financialRows);
  const metrics = getAdminDashboardMetrics(orders, suppliers, finance);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الإدارة</p>
          <h1>لوحة تحكم فلج</h1>
        </div>
      </header>

      <section className="admin-supplier-requests-card">
        <div>
          <p className="eyebrow">طلبات الموردين</p>
          <h2>طلبات انضمام الموردين</h2>
          <p>مراجعة طلبات الشركات الراغبة بالانضمام إلى فلج</p>
        </div>
        {pendingJoinRequests !== null ? (
          <strong className="admin-supplier-requests-count">{pendingJoinRequests}</strong>
        ) : null}
        <button type="button" onClick={() => onNavigate?.("/admin/supplier-requests")}>
          فتح الطلبات
        </button>
      </section>

      <section className="metrics-grid admin-metrics-grid">
        <MetricCard label="موردون قيد المراجعة" value={metrics.pendingSuppliers} tone="cash" />
        <MetricCard label="موردون معتمدون" value={metrics.approvedSuppliers} tone="primary" />
        <MetricCard label="طلبات اليوم" value={metrics.todayOrders} />
        <MetricCard label="مبيعات اليوم" value={metrics.todaySales} />
        <MetricCard label="عمولة فلج اليوم" value={metrics.todayCommission} />
        <MetricCard label="طلبات قيد التوصيل" value={metrics.activeDeliveries} />
        <MetricCard label="طلبات متأخرة" value={metrics.lateOrders} />
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

async function getPendingJoinRequestsCount() {
  if (!supabase) return null;

  try {
    const { count, error } = await supabase
      .from("supplier_join_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "new"]);

    if (error) throw error;
    return count ?? 0;
  } catch {
    return null;
  }
}
