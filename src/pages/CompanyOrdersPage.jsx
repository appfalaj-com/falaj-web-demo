import OrderTable from "../components/OrderTable.jsx";
import { MOCK_COMPANY_ID, getCompanyOrders } from "../services/companyService.js";

export default function CompanyOrdersPage({
  orders,
  drivers,
  onSelectOrder,
  onAcceptOrder,
  onRejectOrder,
  onAssignDriver,
}) {
  const companyOrders = getCompanyOrders(MOCK_COMPANY_ID, orders);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>كل الطلبات</h1>
        </div>
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
