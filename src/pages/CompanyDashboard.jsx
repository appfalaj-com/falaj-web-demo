import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import OrderTable from "../components/OrderTable.jsx";
import { getDashboardMetrics } from "../services/companyService.js";
import { getOrdersByCompanyFromSupabase } from "../services/orderService.js";

export default function CompanyDashboard({
  companyId,
  drivers,
  onSelectOrder,
  onAcceptOrder,
  onRejectOrder,
  onAssignDriver,
}) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextOrders = await getOrdersByCompanyFromSupabase(companyId);
        if (!cancelled) setOrders(nextOrders);
      } catch {
        if (!cancelled) {
          setOrders([]);
          setErrorMessage("تعذر تحميل الطلبات من قاعدة البيانات.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const { newOrders, activeOrders, completedOrders, cashToday, uncollectedCash } =
    getDashboardMetrics(orders);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">شركة المياه</p>
          <h1>لوحة تشغيل الطلبات</h1>
        </div>
      </header>

      <section className="metrics-grid">
        <MetricCard label="الطلبات الجديدة" value={newOrders.length} tone="primary" />
        <MetricCard label="الطلبات النشطة" value={activeOrders.length} />
        <MetricCard label="الطلبات المكتملة" value={completedOrders.length} />
        <MetricCard label="كاش اليوم" value={`${cashToday.toFixed(3)} ر.ع`} tone="cash" />
        <MetricCard label="كاش غير محصل" value={`${uncollectedCash.toFixed(3)} ر.ع`} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>جدول الطلبات الجديدة</h2>
            <p>ستظهر هنا الطلبات الجديدة عند وصولها من العملاء.</p>
          </div>
        </div>
        {isLoading ? (
          <p className="empty-state">جاري تحميل الطلبات...</p>
        ) : errorMessage ? (
          <p className="empty-state">{errorMessage}</p>
        ) : newOrders.length === 0 ? (
          <div className="empty-state">
            <strong>لا توجد طلبات حالية</strong>
            <span>ستظهر هنا الطلبات الجديدة عند وصولها من العملاء.</span>
          </div>
        ) : (
          <OrderTable
            orders={newOrders}
            drivers={drivers}
            showActions
            onSelectOrder={onSelectOrder}
            onAcceptOrder={onAcceptOrder}
            onRejectOrder={onRejectOrder}
            onAssignDriver={onAssignDriver}
          />
        )}
      </section>
    </div>
  );
}
