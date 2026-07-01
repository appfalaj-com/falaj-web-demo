import { useI18n } from "../i18n/I18nProvider.jsx";
import {
  cashCollectionLabel,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "./StatusBadge.jsx";

export default function OrderDetailsPanel({
  order,
  drivers,
  onClose,
  onAccept,
  onReject,
  onAssign,
}) {
  const { t } = useI18n();

  if (!order) return null;

  return (
    <div className="details-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="details-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="details-header">
          <div>
            <p className="eyebrow">{t("ui.orders.orderDetails")}</p>
            <h2 id="order-details-title">{order.id}</h2>
          </div>
          <button type="button" className="ghost close-button" onClick={onClose}>
            {t("common.cancel")}
          </button>
        </div>

        <div className="details-list details-section-list">
          <section className="details-section-card">
            <h3>{t("ui.orders.customerSection")}</h3>
            <dl>
              <Detail label={t("ui.orders.orderNumber")} value={order.id} mono />
              <Detail label={t("ui.orders.customer")} value={order.customer} />
              <Detail label={t("common.phone")} value={order.phone} mono />
              <Detail label={t("ui.orders.area")} value={order.area} />
              <Detail label={t("ui.orders.address")} value={order.address} />
            </dl>
          </section>

          <section className="details-section-card">
            <h3>{t("ui.orders.paymentSection")}</h3>
            <dl>
              <Detail label={t("ui.orders.waterType")} value={order.waterType} />
              <Detail label={t("ui.orders.volume")} value={order.volume} />
              <Detail label={t("ui.orders.amount")} value={formatMoney(order.amount)} />
              <Detail label={t("status.paymentMethod.cash")} value={paymentMethodLabel(t, order.paymentMethod)} />
              <Detail label={t("ui.orders.paymentStatus")} value={paymentStatusLabel(t, order.paymentStatus)} />
              <Detail label={t("ui.orders.cashCollection")} value={cashCollectionLabel(t, order)} />
            </dl>
          </section>

          <section className="details-section-card">
            <h3>{t("ui.orders.operations")}</h3>
            <dl>
              <Detail label={t("ui.orders.status")} value={orderStatusLabel(t, order.status)} />
              <Detail label={t("ui.orders.driver")} value={getDriverName(order.driverId, drivers)} />
              <Detail label={t("ui.orders.notes")} value={order.notes || t("ui.orders.noNotes")} />
            </dl>
          </section>
        </div>

        <div className="details-actions">
          <button type="button" onClick={() => onAccept(order.id)}>
            {t("ui.orders.acceptOrder")}
          </button>
          <button type="button" className="ghost danger-action" onClick={() => onReject(order.id)}>
            {t("ui.orders.rejectOrder")}
          </button>
          <button type="button" className="ghost" onClick={() => onAssign(order.id)}>
            {t("ui.orders.assignDriver")}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value, mono = false }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? "mono" : undefined}>{value || "-"}</dd>
    </div>
  );
}

function getDriverName(driverId, drivers = []) {
  if (!driverId) return "—";
  return drivers.find((driver) => driver.id === driverId)?.name ?? "—";
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}
