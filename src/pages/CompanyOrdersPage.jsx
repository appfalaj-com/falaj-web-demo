import { useEffect, useState } from "react";
import OrderTable from "../components/OrderTable.jsx";
import { getOrdersByCompanyFromSupabase } from "../services/orderService.js";

export default function CompanyOrdersPage({
  drivers,
  companyId,
  onSelectOrder,
  onAcceptOrder,
  onRejectOrder,
  onAssignDriver,
}) {
  const [companyOrders, setCompanyOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const supabaseOrders = await getOrdersByCompanyFromSupabase(companyId);
        if (!cancelled) setCompanyOrders(supabaseOrders);
      } catch {
        if (!cancelled) {
          setCompanyOrders([]);
          setErrorMessage("تعذر تحميل طلبات الشركة من قاعدة البيانات.");
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

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>كل الطلبات</h1>
        </div>
      </header>

      <section className="panel">
        {isLoading ? (
          <p className="empty-state">جاري تحميل الطلبات...</p>
        ) : errorMessage ? (
          <p className="empty-state">{errorMessage}</p>
        ) : companyOrders.length === 0 ? (
          <div className="empty-state">
            <strong>لا توجد طلبات حالية</strong>
            <span>ستظهر هنا طلبات العملاء الجديدة عند وصولها.</span>
          </div>
        ) : (
          <OrderTable
            orders={companyOrders}
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
