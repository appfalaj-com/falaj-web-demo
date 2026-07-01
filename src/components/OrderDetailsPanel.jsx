export default function OrderDetailsPanel({
  order,
  drivers,
  onClose,
  onAccept,
  onReject,
  onAssign,
}) {
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
            <p className="eyebrow">تفاصيل الطلب</p>
            <h2 id="order-details-title">{order.id}</h2>
          </div>
          <button type="button" className="ghost close-button" onClick={onClose}>
            إغلاق
          </button>
        </div>

        <div className="details-list details-section-list">
          <section className="details-section-card">
            <h3>بيانات العميل</h3>
            <dl>
              <Detail label="رقم الطلب" value={order.id} mono />
              <Detail label="اسم العميل" value={order.customer} />
              <Detail label="الهاتف" value={order.phone} mono />
              <Detail label="المنطقة" value={order.area} />
              <Detail label="تفاصيل العنوان" value={order.address} />
            </dl>
          </section>

          <section className="details-section-card">
            <h3>الطلب والدفع</h3>
            <dl>
              <Detail label="نوع المياه" value={order.waterType} />
              <Detail label="الحجم" value={order.volume} />
              <Detail label="السعر" value={`${order.amount.toFixed(3)} ر.ع`} />
              <Detail label="طريقة الدفع" value={paymentMethodLabel(order.paymentMethod)} />
              <Detail label="حالة الدفع" value={paymentLabel(order.paymentStatus)} />
              <Detail label="استلام الكاش بواسطة السائق" value={cashCollectedLabel(order)} />
            </dl>
          </section>

          <section className="details-section-card">
            <h3>التشغيل</h3>
            <dl>
              <Detail label="الحالة الحالية" value={statusLabel(order.status)} />
              <Detail label="السائق" value={getDriverName(order.driverId, drivers)} />
              <Detail label="الملاحظات" value={order.notes || "لا توجد ملاحظات"} />
            </dl>
          </section>
        </div>

        <div className="details-actions">
          <button type="button" onClick={() => onAccept(order.id)}>
            قبول الطلب
          </button>
          <button type="button" className="ghost" onClick={() => onReject(order.id)}>
            رفض الطلب
          </button>
          <button type="button" className="ghost" onClick={() => onAssign(order.id)}>
            تعيين سائق
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
      <dd className={mono ? "mono" : undefined}>{value}</dd>
    </div>
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

function paymentLabel(paymentStatus) {
  if (paymentStatus === "paid") return "مدفوع";
  if (paymentStatus === "collected") return "محصل";
  if (paymentStatus === "refunded") return "مسترجع";
  return "غير مدفوع";
}

function paymentMethodLabel(paymentMethod) {
  return paymentMethod === "card" ? "بطاقة" : "كاش";
}

function cashCollectedLabel(order) {
  if (order.paymentMethod !== "cash") return "لا ينطبق";
  return order.cashCollectedByDriver ? "نعم" : "لا";
}

function getDriverName(driverId, drivers = []) {
  if (!driverId) return "لم يعين";
  return drivers.find((driver) => driver.id === driverId)?.name ?? "غير معروف";
}
