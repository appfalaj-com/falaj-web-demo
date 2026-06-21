import { MOCK_DRIVER_ID, getDriverWorkflow } from "../services/driverService.js";

const DRIVER_ID = MOCK_DRIVER_ID;
const DONE_STATUSES = ["delivered", "failed"];
const TIMELINE = ["accepted", "assigned", "en_route", "arrived", "delivered"];

export default function DriverPage({ orders, drivers, onSetStatus, onMarkPaid }) {
  const { driver, currentOrder, nextOrders, completedOrders } = getDriverWorkflow(
    DRIVER_ID,
    orders,
    drivers
  );
  const todayOrders = [...(currentOrder ? [currentOrder] : []), ...nextOrders, ...completedOrders];

  return (
    <div className="page driver-page">
      <header className="page-header compact">
        <div>
          <p className="eyebrow">واجهة السائق</p>
          <h1>طلبات {driver?.name ?? "السائق"} اليوم</h1>
        </div>
      </header>

      <section className="panel overview">
        <h2>تتبع الموقع</h2>
        <p>
          لم يتم تشغيل GPS حقيقي في هذه المرحلة. يحتاج التتبع الفعلي إلى تطبيق سائق أو Web GPS مع تصريح
          موقع واضح وحدود للخلفية.
        </p>
        <button type="button" className="ghost">
          تجهيز طلب صلاحية الموقع لاحقًا
        </button>
      </section>

      <DriverSection title="الطلب الحالي">
        {currentOrder ? (
          <DriverOrderCard
            order={currentOrder}
            isCurrent
            onSetStatus={onSetStatus}
            onMarkPaid={onMarkPaid}
          />
        ) : (
          <EmptyDriverCard text="لا يوجد طلب نشط الآن." />
        )}
      </DriverSection>

      <DriverSection title="الطلبات المعينة">
        {nextOrders.length > 0 ? (
          nextOrders.map((order) => (
            <DriverOrderCard
              key={order.id}
              order={order}
              onSetStatus={onSetStatus}
              onMarkPaid={onMarkPaid}
            />
          ))
        ) : (
          <EmptyDriverCard text="لا توجد طلبات معينة تالية." />
        )}
      </DriverSection>

      <DriverSection title="كل طلبات اليوم">
        {todayOrders.length > 0 ? (
          todayOrders.map((order) => (
            <DriverOrderCard
              key={`${order.id}-today`}
              order={order}
              onSetStatus={onSetStatus}
              onMarkPaid={onMarkPaid}
            />
          ))
        ) : (
          <EmptyDriverCard text="لا توجد طلبات اليوم." />
        )}
      </DriverSection>
    </div>
  );
}

function DriverSection({ title, children }) {
  return (
    <section className="driver-section">
      <h2>{title}</h2>
      <div className="driver-orders">{children}</div>
    </section>
  );
}

function DriverOrderCard({ order, isCurrent = false, onSetStatus, onMarkPaid }) {
  const canAccept = order.status === "pending";
  const canPickup = order.status === "accepted";
  const canStart = order.status === "assigned";
  const canArrive = order.status === "en_route";
  const canDeliver = order.status === "arrived";
  const canPay =
    order.status === "delivered" &&
    order.paymentMethod === "cash" &&
    order.paymentStatus === "unpaid";
  const canFail = !DONE_STATUSES.includes(order.status);

  return (
    <article className={isCurrent ? "mobile-order-card driver-current-card" : "mobile-order-card"}>
      <div className="mobile-order-head">
        <strong>{order.id}</strong>
        <span className={`status ${order.status}`}>{statusLabel(order.status)}</span>
      </div>

      <h3>{order.customer}</h3>
      <p>
        {order.area} - {order.address}
      </p>

      <DriverTimeline status={order.status} />

      <div className="order-detail-row">
        <span>{order.waterType}</span>
        <strong>{order.volume}</strong>
      </div>
      <div className="order-detail-row">
        <span>حالة الدفع</span>
        <strong>{paymentStatusLabel(order.paymentStatus)}</strong>
      </div>
      <div className="order-detail-row">
        <span>تحصيل الكاش</span>
        <strong>{cashCollectedLabel(order)}</strong>
      </div>
      <div className="order-detail-row">
        <span>المبلغ</span>
        <strong>{order.amount.toFixed(3)} ر.ع</strong>
      </div>

      <div className="driver-actions">
        {canAccept && (
          <button type="button" onClick={() => onSetStatus(order.id, "accepted")}>
            قبول الطلب
          </button>
        )}
        {canPickup && (
          <button type="button" onClick={() => onSetStatus(order.id, "assigned")}>
            استلام الطلب
          </button>
        )}
        {canStart && (
          <button type="button" onClick={() => onSetStatus(order.id, "en_route")}>
            بدء التوصيل
          </button>
        )}
        {canArrive && (
          <button type="button" onClick={() => onSetStatus(order.id, "arrived")}>
            وصلت للموقع
          </button>
        )}
        {canDeliver && (
          <button type="button" onClick={() => onSetStatus(order.id, "delivered")}>
            تم التسليم
          </button>
        )}
        {canPay && (
          <button type="button" className="cash" onClick={() => onMarkPaid(order.id)}>
            استلمت الكاش
          </button>
        )}
        {canFail && (
          <button type="button" className="ghost danger-action" onClick={() => onSetStatus(order.id, "failed")}>
            تعذر التسليم
          </button>
        )}
      </div>
    </article>
  );
}

function DriverTimeline({ status }) {
  return (
    <ol className="driver-timeline" aria-label="حالة الطلب">
      {TIMELINE.map((step) => {
        const active = timelineIndex(status) >= timelineIndex(step);
        return (
          <li key={step} className={active ? "active" : undefined}>
            <span />
            <small>{statusLabel(step)}</small>
          </li>
        );
      })}
    </ol>
  );
}

function EmptyDriverCard({ text }) {
  return (
    <article className="mobile-order-card empty-driver-card">
      <p>{text}</p>
    </article>
  );
}

function timelineIndex(status) {
  const index = TIMELINE.indexOf(status);
  return index === -1 ? -1 : index;
}

function paymentStatusLabel(paymentStatus) {
  return paymentStatus === "paid" ? "مدفوع" : "غير مدفوع";
}

function cashCollectedLabel(order) {
  if (order.paymentMethod !== "cash") return "لا ينطبق";
  return order.cashCollectedByDriver ? "تم الاستلام" : "غير مستلم";
}

function statusLabel(status) {
  const labels = {
    pending: "جديد",
    accepted: "مقبول",
    assigned: "مسند",
    en_route: "في الطريق",
    arrived: "وصل",
    delivered: "تم التسليم",
    failed: "تعذر التسليم",
  };

  return labels[status] ?? status;
}
