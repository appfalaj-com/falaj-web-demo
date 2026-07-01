import { useI18n } from "../i18n/I18nProvider.jsx";
import StatusBadge, { paymentMethodLabel, paymentStatusLabel } from "./StatusBadge.jsx";

export default function OrderTable({
  orders,
  drivers,
  showActions = false,
  onSelectOrder,
  onAcceptOrder,
  onRejectOrder,
  onAssignDriver,
}) {
  const { t } = useI18n();

  if (!orders.length) {
    return (
      <div className="empty-state data-empty-state">
        <strong>{t("ui.orders.emptyTitle")}</strong>
        <span>{t("ui.orders.emptyText")}</span>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrap">
        <table className="falaj-table">
          <thead>
            <tr>
              <th>{t("ui.orders.orderNumber")}</th>
              <th>{t("ui.orders.customer")}</th>
              <th>{t("ui.orders.area")}</th>
              <th>{t("ui.orders.quantity")}</th>
              <th>{t("ui.orders.driver")}</th>
              <th>{t("ui.orders.amount")}</th>
              <th>{t("ui.orders.status")}</th>
              <th>{t("ui.orders.payment")}</th>
              {showActions && <th>{t("ui.orders.action")}</th>}
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
                <td className="mono order-code-cell">{order.id}</td>
                <td>{order.customer}</td>
                <td>{order.area}</td>
                <td>{order.volume}</td>
                <td>{getDriverName(order.driverId, drivers)}</td>
                <td>{formatMoney(order.amount)}</td>
                <td>
                  <StatusBadge value={order.status} />
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
                <StatusBadge value={order.status} />
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
              <span>{t("ui.orders.amount")}</span>
              <strong>{formatMoney(order.amount)}</strong>
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
  const { t } = useI18n();

  function runAction(event, action) {
    event.stopPropagation();
    action?.(orderId);
  }

  return (
    <div className="row-actions">
      <button type="button" onClick={(event) => runAction(event, onAcceptOrder)}>
        {t("ui.orders.accept")}
      </button>
      <button type="button" className="ghost" onClick={(event) => runAction(event, onRejectOrder)}>
        {t("ui.orders.reject")}
      </button>
      <button type="button" className="ghost" onClick={(event) => runAction(event, onAssignDriver)}>
        {t("ui.orders.assignDriver")}
      </button>
    </div>
  );
}

function PaymentBadge({ order }) {
  const { t } = useI18n();

  return (
    <span className={`payment-badge falaj-badge ${order.paymentMethod} ${order.paymentStatus}`}>
      {paymentMethodLabel(t, order.paymentMethod)} - {paymentStatusLabel(t, order.paymentStatus)}
    </span>
  );
}

function getDriverName(driverId, drivers = []) {
  if (!driverId) return "—";
  return drivers.find((driver) => driver.id === driverId)?.name ?? "—";
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}
