export default function OrderTable({
  orders,
  drivers,
  showActions = false,
  onSelectOrder,
  onAcceptOrder,
  onRejectOrder,
  onAssignDriver,
}) {
  return (
    <>
      <div className="table-wrap">
        <table className="falaj-table">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>العميل</th>
              <th>المنطقة</th>
              <th>الكمية</th>
              <th>السائق</th>
              <th>المبلغ</th>
              <th>الحالة</th>
              <th>الدفع</th>
              {showActions && <th>إجراء</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="clickable-row"
                onClick={() => onSelectOrder?.(order.id)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onSelectOrder?.(order.id);
                }}
              >
                <td className="mono">{order.id}</td>
                <td>{order.customer}</td>
                <td>{order.area}</td>
                <td>{order.volume}</td>
                <td>{getDriverName(order.driverId, drivers)}</td>
                <td>{order.amount.toFixed(3)} ر.ع</td>
                <td>
                  <span className={`status falaj-badge ${order.status}`}>{statusLabel(order.status)}</span>
                </td>
                <td>
                  <PaymentBadge order={order} />
                </td>
                {showActions && (
                  <td>
                    <OrderActions
                      orderId={order.id}
                      onAcceptOrder={onAcceptOrder}
                      onRejectOrder={onRejectOrder}
                      onAssignDriver={onAssignDriver}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="orders-mobile-list">
        {orders.map((order) => (
          <article
            className="order-mobile-card"
            key={order.id}
            onClick={() => onSelectOrder?.(order.id)}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelectOrder?.(order.id);
            }}
          >
            <div className="order-mobile-head">
              <strong className="mono">{order.id}</strong>
              <span className="badge-pair">
                <span className={`status falaj-badge ${order.status}`}>{statusLabel(order.status)}</span>
                <PaymentBadge order={order} />
              </span>
            </div>

            <h3>{order.customer}</h3>
            <p>{order.area}</p>

            <div className="order-mobile-detail">
              <span>{order.waterType}</span>
              <strong>{order.volume}</strong>
            </div>
            <div className="order-mobile-detail">
              <span>السعر</span>
              <strong>{order.amount.toFixed(3)} ر.ع</strong>
            </div>

            {showActions && (
              <OrderActions
                orderId={order.id}
                onAcceptOrder={onAcceptOrder}
                onRejectOrder={onRejectOrder}
                onAssignDriver={onAssignDriver}
              />
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function OrderActions({ orderId, onAcceptOrder, onRejectOrder, onAssignDriver }) {
  function runAction(event, action) {
    event.stopPropagation();
    action?.(orderId);
  }

  return (
    <div className="row-actions">
      <button type="button" onClick={(event) => runAction(event, onAcceptOrder)}>
        قبول
      </button>
      <button type="button" className="ghost" onClick={(event) => runAction(event, onRejectOrder)}>
        رفض
      </button>
      <button type="button" className="ghost" onClick={(event) => runAction(event, onAssignDriver)}>
        تعيين سائق
      </button>
    </div>
  );
}

function PaymentBadge({ order }) {
  return (
    <span className={`payment-badge falaj-badge ${order.paymentStatus}`}>
      {paymentMethodLabel(order.paymentMethod)} - {paymentStatusLabel(order.paymentStatus)}
    </span>
  );
}

function statusLabel(status) {
  const labels = {
    pending: "جديد",
    active: "نشط",
    accepted: "مقبول",
    assigned: "مسند",
    en_route: "في الطريق",
    arrived: "وصل",
    delivered: "تم التسليم",
    failed: "فشل التسليم",
    rejected: "مرفوض",
    completed: "مكتمل",
  };

  return labels[status] ?? status;
}

function paymentMethodLabel(paymentMethod) {
  return paymentMethod === "card" ? "card" : "cash";
}

function paymentStatusLabel(paymentStatus) {
  return paymentStatus === "paid" ? "paid" : "unpaid";
}

function getDriverName(driverId, drivers = []) {
  if (!driverId) return "لم يعين";
  return drivers.find((driver) => driver.id === driverId)?.name ?? "غير معروف";
}
