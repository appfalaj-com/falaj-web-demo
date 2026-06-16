import MetricCard from "../components/MetricCard.jsx";
import { getAdminMetrics } from "../services/adminService.js";

export default function AdminPage({ orders, drivers }) {
  const { totalOrders, paidOrders, unpaidOrders, uncollectedCash } = getAdminMetrics(orders);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الإدارة</p>
          <h1>نظرة عامة على المنصة</h1>
        </div>
      </header>

      <section className="metrics-grid">
        <MetricCard label="إجمالي الطلبات" value={totalOrders} tone="primary" />
        <MetricCard label="المدفوع" value={paidOrders} />
        <MetricCard label="غير المدفوع" value={unpaidOrders} />
        <MetricCard label="الكاش غير المحصل" value={`${uncollectedCash.toFixed(3)} ر.ع`} tone="cash" />
      </section>

      <section className="panel overview">
        <h2>حالة المرحلة</h2>
        <p>
          هذه واجهة mock فقط للشركة والسائق والإدارة. لا يوجد اتصال بقاعدة بيانات أو
          Supabase في هذه المرحلة.
        </p>
      </section>
    </div>
  );
}
