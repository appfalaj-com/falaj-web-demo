import { useEffect, useState } from "react";
import OrderTable from "../components/OrderTable.jsx";
import { MOCK_COMPANY_ID, getCompanyOrders } from "../services/companyService.js";
import { getOrdersByCompanyFromSupabase } from "../services/orderService.js";

export default function CompanyOrdersPage({
  orders,
  drivers,
  onSelectOrder,
  onAcceptOrder,
  onRejectOrder,
  onAssignDriver,
}) {
  const [companyOrders, setCompanyOrders] = useState(() => getCompanyOrders(MOCK_COMPANY_ID, orders));
  const [dataMode, setDataMode] = useState("mock");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const supabaseOrders = await getOrdersByCompanyFromSupabase(MOCK_COMPANY_ID);
        if (!cancelled && supabaseOrders.length > 0) {
          setCompanyOrders(supabaseOrders);
          setDataMode("supabase");
        } else if (!cancelled) {
          setCompanyOrders(getCompanyOrders(MOCK_COMPANY_ID, orders));
          setDataMode("mock");
        }
      } catch {
        if (!cancelled) {
          setCompanyOrders(getCompanyOrders(MOCK_COMPANY_ID, orders));
          setDataMode("mock");
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [orders]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>كل الطلبات</h1>
        </div>
        <span className="checkpoint">
          {dataMode === "supabase" ? "متصل بقاعدة البيانات" : "وضع تجريبي"}
        </span>
      </header>

      <section className="panel">
        <OrderTable
          orders={companyOrders}
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
