import MetricCard from "../components/MetricCard.jsx";
import OrderTable from "../components/OrderTable.jsx";
import { getDashboardMetrics } from "../services/companyService.js";

export default function CompanyDashboard({
  orders,
  drivers,
  onSelectOrder,
  onAcceptOrder,
  onRejectOrder,
  onAssignDriver,
}) {
  const { newOrders, activeOrders, completedOrders, cashToday, uncollectedCash } =
    getDashboardMetrics(orders);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">شركة المياه</p>
          <h1>لوحة تشغيل الطلبات</h1>
        </div>
        <span className="checkpoint">Falaj_WebDashboard_OrderWorkflowMock_20260615</span>
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
            <p>اضغط على أي طلب لعرض التفاصيل، أو استخدم الإجراءات السريعة.</p>
          </div>
        </div>
        <OrderTable
          orders={newOrders}
          drivers={drivers}
          showActions
          onSelectOrder={onSelectOrder}
          onAcceptOrder={onAcceptOrder}
          onRejectOrder={onRejectOrder}
          onAssignDriver={onAssignDriver}
        />
      </section>
    </div>
  );
}
