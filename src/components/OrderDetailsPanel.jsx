import { getDriverName } from "../data/mockData.js";

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

        <dl className="details-list">
          <Detail label="رقم الطلب" value={order.id} mono />
          <Detail label="اسم العميل" value={order.customer} />
          <Detail label="الهاتف" value={order.phone} mono />
          <Detail label="المنطقة" value={order.area} />
          <Detail label="تفاصيل العنوان" value={order.address} />
          <Detail label="نوع المياه" value={order.waterType} />
          <Detail label="الحجم" value={order.volume} />
          <Detail label="السعر" value={`${order.amount.toFixed(3)} ر.ع`} />
          <Detail label="طريقة الدفع" value={order.paymentMethod} mono />
          <Detail label="حالة الدفع" value={order.paymentStatus} mono />
          <Detail label="استلام الكاش بواسطة السائق" value={cashCollectedLabel(order)} />
          <Detail label="الحالة الحالية" value={statusLabel(order.status)} />
          <Detail label="السائق" value={getDriverName(order.driverId, drivers)} />
          <Detail label="الملاحظات" value={order.notes || "لا توجد ملاحظات"} />
        </dl>

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
  return paymentStatus === "paid" ? "مدفوع" : "غير مدفوع";
}

function cashCollectedLabel(order) {
  if (order.paymentMethod !== "cash") return "لا ينطبق";
  return order.cashCollectedByDriver ? "نعم" : "لا";
}
