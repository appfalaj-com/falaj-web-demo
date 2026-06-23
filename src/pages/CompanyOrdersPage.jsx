import { useEffect, useMemo, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import {
  getOrdersByCompanyFromSupabase,
  getOrderStatusHistoryFromSupabase,
  updateCompanyOrderStatusInSupabase,
} from "../services/orderService.js";

const STATUS_LABELS = {
  pending: "جديد",
  accepted: "قيد التجهيز",
  rejected: "مرفوض",
  assigned: "جاهز للتسليم",
  en_route: "في الطريق",
  arrived: "وصل",
  delivered: "مكتمل",
  failed: "ملغي",
  cancelled: "ملغي",
};

const PAYMENT_METHOD_LABELS = {
  cash: "كاش",
  card: "بطاقة",
};

const PAYMENT_STATUS_LABELS = {
  unpaid: "غير مدفوع",
  paid: "مدفوع",
  refunded: "مسترجع",
};

const ORDERS_LOAD_ERROR = "تعذر تحميل طلبات الشركة من قاعدة البيانات. حاول التحديث مرة أخرى.";
const ORDER_STATUS_UPDATE_ERROR = "تعذر تحديث حالة الطلب حاليًا. حاول مرة أخرى.";

const FILTERS = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "جديدة" },
  { value: "accepted", label: "قيد التجهيز" },
  { value: "en_route", label: "في الطريق" },
  { value: "delivered", label: "مكتملة" },
  { value: "cancelled", label: "ملغية" },
];

const NEXT_ACTIONS = {
  pending: [
    { status: "accepted", label: "قبول الطلب / قيد التجهيز" },
    { status: "cancelled", label: "إلغاء" },
  ],
  accepted: [
    { status: "assigned", label: "جاهز للتسليم" },
    { status: "cancelled", label: "إلغاء" },
  ],
  assigned: [
    { status: "en_route", label: "في الطريق" },
    { status: "cancelled", label: "إلغاء" },
  ],
  en_route: [
    { status: "delivered", label: "مكتمل" },
    { status: "failed", label: "فشل التسليم" },
  ],
  arrived: [
    { status: "delivered", label: "مكتمل" },
    { status: "failed", label: "فشل التسليم" },
  ],
};

export default function CompanyOrdersPage({ companyId }) {
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const supabaseOrders = await getOrdersByCompanyFromSupabase(companyId);
        if (!cancelled) {
          setOrders(supabaseOrders);
          setSelectedOrderId((current) => current ?? supabaseOrders[0]?.rawId ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setOrders([]);
          setErrorMessage(ORDERS_LOAD_ERROR);
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

  const visibleOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = activeStatus === "all" || orderMatchesFilter(order, activeStatus);
      if (!matchesStatus) return false;
      if (!query) return true;

      return [order.id, order.customer, order.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activeStatus, orders, searchTerm]);

  const selectedOrder =
    visibleOrders.find((order) => order.rawId === selectedOrderId) ??
    visibleOrders[0] ??
    null;

  useEffect(() => {
    let cancelled = false;

    async function loadTimeline() {
      if (!selectedOrder?.rawId) {
        setTimeline([]);
        return;
      }

      setIsTimelineLoading(true);
      try {
        const nextTimeline = await getOrderStatusHistoryFromSupabase(selectedOrder.rawId);
        if (!cancelled) setTimeline(nextTimeline);
      } catch {
        if (!cancelled) setTimeline([]);
      } finally {
        if (!cancelled) setIsTimelineLoading(false);
      }
    }

    loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [selectedOrder?.rawId]);

  const summary = useMemo(() => summarizeOrders(orders), [orders]);

  async function updateOrderStatus(order, nextStatus) {
    setMessage("");
    setErrorMessage("");
    setUpdatingOrderId(order.rawId);

    try {
      const statusForDatabase = nextStatus === "cancelled" ? "cancelled" : nextStatus;
      const updatedOrder = await updateCompanyOrderStatusInSupabase(companyId, order.rawId, statusForDatabase);
      setOrders((current) => current.map((item) => (item.rawId === order.rawId ? updatedOrder : item)));
      setSelectedOrderId(order.rawId);
      setMessage("تم تحديث حالة الطلب بنجاح.");
    } catch (error) {
      setErrorMessage(ORDER_STATUS_UPDATE_ERROR);
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>طلبات المورد</h1>
          <p>إدارة الطلبات الموجودة في Supabase بدون تغيير الدفع أو بيانات العميل.</p>
        </div>
      </header>

      {message ? <p className="auth-alert success">{message}</p> : null}
      {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}

      <section className="metrics-grid">
        <MetricCard label="إجمالي الطلبات" value={summary.total} tone="primary" />
        <MetricCard label="طلبات جديدة" value={summary.pending} />
        <MetricCard label="قيد التجهيز" value={summary.accepted} />
        <MetricCard label="في الطريق" value={summary.enRoute} />
        <MetricCard label="مكتملة" value={summary.delivered} tone="cash" />
        <MetricCard label="ملغية" value={summary.cancelled} />
      </section>

      <section className="status-tabs" aria-label="تصفية الطلبات">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={activeStatus === filter.value ? "active" : "ghost"}
            onClick={() => setActiveStatus(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </section>

      <section className="panel overview">
        <div className="filter-row supplier-requests-search">
          <label>
            بحث
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="رقم الطلب، اسم العميل، الهاتف"
            />
          </label>
        </div>
      </section>

      <section className="supplier-requests-review-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>قائمة الطلبات</h2>
              <p>مرتبة من الأحدث إلى الأقدم، ومحصورة بطلبات شركتكم فقط.</p>
            </div>
          </div>

          {isLoading ? (
            <p className="empty-state">جاري تحميل الطلبات...</p>
          ) : visibleOrders.length === 0 ? (
            <div className="empty-state">
              <strong>لا توجد طلبات حاليًا</strong>
              <span>ستظهر هنا طلبات العملاء عند وصولها إلى شركتكم.</span>
            </div>
          ) : (
            <div className="supplier-request-list">
              {visibleOrders.map((order) => (
                <button
                  key={order.rawId}
                  type="button"
                  className={`supplier-request-card ${selectedOrder?.rawId === order.rawId ? "active" : ""}`}
                  onClick={() => setSelectedOrderId(order.rawId)}
                >
                  <span className={`status ${order.status}`}>{statusLabel(order.status)}</span>
                  <strong>{order.id}</strong>
                  <small>{order.customer || "عميل غير محدد"} · {order.phone || "-"}</small>
                  <span>{formatDateTime(order.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <OrderDetailPanel
          order={selectedOrder}
          timeline={timeline}
          isTimelineLoading={isTimelineLoading}
          isUpdating={updatingOrderId === selectedOrder?.rawId}
          onUpdateStatus={updateOrderStatus}
        />
      </section>
    </div>
  );
}

function OrderDetailPanel({ order, timeline, isTimelineLoading, isUpdating, onUpdateStatus }) {
  if (!order) {
    return (
      <aside className="panel supplier-request-detail-panel">
        <div className="empty-state">
          <strong>اختر طلبًا</strong>
          <span>ستظهر تفاصيل الطلب هنا.</span>
        </div>
      </aside>
    );
  }

  const actions = NEXT_ACTIONS[order.status] ?? [];

  return (
    <aside className="panel supplier-request-detail-panel">
      <div className="panel-header">
        <div>
          <h2>{order.id}</h2>
          <p>{order.customer || "عميل غير محدد"}</p>
        </div>
        <span className={`status ${order.status}`}>{statusLabel(order.status)}</span>
      </div>

      <dl className="supplier-request-detail-list">
        <DetailRow label="اسم العميل" value={order.customer} />
        <DetailRow label="هاتف العميل" value={order.phone} />
        <DetailRow label="المنطقة" value={order.area} />
        <DetailRow label="العنوان" value={order.address} />
        <DetailRow label="نوع المياه" value={order.waterType} />
        <DetailRow label="الكمية" value={order.volume} />
        <DetailRow label="طريقة الدفع" value={paymentMethodLabel(order.paymentMethod)} />
        <DetailRow label="حالة الدفع" value={paymentStatusLabel(order.paymentStatus)} />
        <DetailRow label="القيمة" value={formatMoney(order.amount)} />
        <DetailRow label="تاريخ الإنشاء" value={formatDateTime(order.createdAt)} />
        <DetailRow label="آخر تحديث" value={formatDateTime(order.updatedAt)} />
        <DetailRow label="ملاحظات" value={order.notes || "-"} />
      </dl>

      <section className="order-products-empty">
        <h3>منتجات الطلب</h3>
        <p>لا يوجد جدول منتجات مرتبط بهذا الطلب حاليًا.</p>
      </section>

      <section className="order-timeline-section">
        <h3>سجل حالة الطلب</h3>
        {isTimelineLoading ? (
          <p className="empty-state">جاري تحميل السجل...</p>
        ) : timeline.length === 0 ? (
          <p className="empty-state">لا يوجد سجل حالات لهذا الطلب.</p>
        ) : (
          <ol className="supplier-request-timeline">
            {timeline.map((item) => (
              <li className="done" key={item.id}>
                {statusLabel(item.status)} · {formatDateTime(item.createdAt)}
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="row-actions supplier-request-actions">
        {actions.length === 0 ? (
          <button type="button" className="ghost" disabled>
            لا توجد إجراءات متاحة
          </button>
        ) : (
          actions.map((action) => (
            <button
              key={action.status}
              type="button"
              className={action.status === "cancelled" || action.status === "failed" ? "ghost danger-action" : "ghost"}
              onClick={() => onUpdateStatus(order, action.status)}
              disabled={isUpdating}
            >
              {isUpdating ? "جاري التحديث..." : action.label}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "-"}</dd>
    </div>
  );
}

function summarizeOrders(orders) {
  return orders.reduce(
    (summary, order) => {
      summary.total += 1;
      if (order.status === "pending") summary.pending += 1;
      if (order.status === "accepted" || order.status === "assigned") summary.accepted += 1;
      if (order.status === "en_route" || order.status === "arrived") summary.enRoute += 1;
      if (order.status === "delivered") summary.delivered += 1;
      if (["cancelled", "failed", "rejected"].includes(order.status)) summary.cancelled += 1;
      return summary;
    },
    { total: 0, pending: 0, accepted: 0, enRoute: 0, delivered: 0, cancelled: 0 }
  );
}

function orderMatchesFilter(order, filter) {
  if (filter === "cancelled") return ["cancelled", "failed", "rejected"].includes(order.status);
  if (filter === "accepted") return ["accepted", "assigned"].includes(order.status);
  if (filter === "en_route") return ["en_route", "arrived"].includes(order.status);
  return order.status === filter;
}

function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

function paymentMethodLabel(paymentMethod) {
  return PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod ?? "-";
}

function paymentStatusLabel(paymentStatus) {
  return PAYMENT_STATUS_LABELS[paymentStatus] ?? paymentStatus ?? "-";
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ar-OM");
}
