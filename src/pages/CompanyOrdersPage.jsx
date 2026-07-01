import { useEffect, useMemo, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import {
  assignCompanyOrderDriverInSupabase,
  getOrdersByCompanyFromSupabase,
  getOrderStatusHistoryFromSupabase,
  updateCompanyOrderStatusInSupabase,
} from "../services/orderService.js";
import { getDriversByCompanyFromSupabase } from "../services/driverService.js";

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
  collected: "محصل",
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
  const [drivers, setDrivers] = useState([]);
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
        const [supabaseOrders, supabaseDrivers] = await Promise.all([
          getOrdersByCompanyFromSupabase(companyId),
          getDriversByCompanyFromSupabase(companyId),
        ]);
        if (!cancelled) {
          setOrders(supabaseOrders);
          setDrivers(supabaseDrivers);
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

  async function assignDriver(order, driverId) {
    if (!driverId) return;
    setMessage("");
    setErrorMessage("");
    setUpdatingOrderId(order.rawId);

    try {
      const updatedOrder = await assignCompanyOrderDriverInSupabase(companyId, order.rawId, driverId);
      setOrders((current) => current.map((item) => (item.rawId === order.rawId ? updatedOrder : item)));
      setSelectedOrderId(order.rawId);
      setMessage("تم تعيين السائق بنجاح.");
    } catch {
      setErrorMessage("تعذر تعيين السائق لهذا الطلب.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <div className="page orders-page company-orders-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>طلبات المورد</h1>
          <p>إدارة الطلبات الموجودة في Supabase بدون تغيير الدفع أو بيانات العميل.</p>
        </div>
      </header>

      {message ? <p className="auth-alert success">{message}</p> : null}
      {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}

      <section className="metrics-grid orders-metrics-grid">
        <MetricCard label="إجمالي الطلبات" value={summary.total} tone="primary" />
        <MetricCard label="طلبات جديدة" value={summary.pending} />
        <MetricCard label="قيد التجهيز" value={summary.accepted} />
        <MetricCard label="في الطريق" value={summary.enRoute} />
        <MetricCard label="مكتملة" value={summary.delivered} tone="cash" />
        <MetricCard label="ملغية" value={summary.cancelled} />
      </section>

      <section className="status-tabs order-status-tabs" aria-label="تصفية الطلبات">
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

      <section className="panel overview filter-bar-panel">
        <div className="filter-row order-filter-bar supplier-requests-search">
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

      <section className="supplier-requests-review-grid orders-workspace-grid">
        <div className="panel order-list-panel">
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
                  className={`supplier-request-card order-list-card ${selectedOrder?.rawId === order.rawId ? "active" : ""}`}
                  onClick={() => setSelectedOrderId(order.rawId)}
                >
                  <span className={`status status-badge ${order.status}`}>{statusLabel(order.status)}</span>
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
          drivers={drivers}
          onAssignDriver={assignDriver}
        />
      </section>
    </div>
  );
}

function OrderDetailPanel({ order, timeline, isTimelineLoading, isUpdating, onUpdateStatus, drivers, onAssignDriver }) {
  if (!order) {
    return (
      <aside className="panel supplier-request-detail-panel order-detail-panel">
        <div className="empty-state">
          <strong>اختر طلبًا</strong>
          <span>ستظهر تفاصيل الطلب هنا.</span>
        </div>
      </aside>
    );
  }

  const actions = NEXT_ACTIONS[order.status] ?? [];

  return (
    <aside className="panel supplier-request-detail-panel order-detail-panel">
      <div className="panel-header">
        <div>
          <h2>{order.id}</h2>
          <p>{order.customer || "عميل غير محدد"}</p>
        </div>
        <span className={`status status-badge ${order.status}`}>{statusLabel(order.status)}</span>
      </div>

      <section className="order-detail-section">
        <h3>بيانات العميل</h3>
        <dl className="supplier-request-detail-list">
          <DetailRow label="اسم العميل" value={order.customer} />
          <DetailRow label="هاتف العميل" value={order.phone} />
          <DetailRow label="المنطقة" value={order.area} />
          <DetailRow label="العنوان" value={order.address} />
        </dl>
      </section>

      <section className="order-detail-section">
        <h3>الدفع والتشغيل</h3>
        <dl className="supplier-request-detail-list">
          <DetailRow label="طريقة الدفع" value={paymentMethodLabel(order.paymentMethod)} />
          <DetailRow label="حالة الدفع" value={paymentStatusLabel(order.paymentStatus)} />
          <DetailRow label="تحصيل الكاش" value={cashCollectionLabel(order)} />
          <DetailRow label="السائق" value={driverLabel(order, drivers)} />
          <DetailRow label="القيمة" value={formatMoney(order.amount)} />
          <DetailRow label="تاريخ الإنشاء" value={formatDateTime(order.createdAt)} />
          <DetailRow label="آخر تحديث" value={formatDateTime(order.updatedAt)} />
          <DetailRow label="ملاحظات" value={order.notes || "-"} />
        </dl>
      </section>

      <section className="order-products-empty">
        <h3>منتجات الطلب</h3>
        {order.items?.length ? (
          <div className="order-items-list">
            {order.items.map((item) => (
              <div className="order-item-row" key={item.id}>
                <span>{item.name}</span>
                <strong>{item.quantity} × {formatMoney(item.unitPrice)}</strong>
                <small>{formatMoney(item.lineTotal)}</small>
              </div>
            ))}
          </div>
        ) : (
          <p>لا يوجد جدول منتجات مرتبط بهذا الطلب حاليًا.</p>
        )}
      </section>

      <section className="order-timeline-section">
        <div className="next-action-banner">
          <span>الإجراء التالي المقترح</span>
          <strong>{nextCompanyActionHint(order)}</strong>
        </div>
      </section>

      <section className="order-timeline-section">
        <h3>تعيين السائق</h3>
        {drivers.length === 0 ? (
          <p className="empty-state">لا يوجد سائقون نشطون حاليًا. أضف سائقًا من صفحة السائقين قبل الإسناد.</p>
        ) : (
          <label className="inline-select-label">
            السائق
            <select
              value={order.driverId || ""}
              onChange={(event) => onAssignDriver(order, event.target.value)}
              disabled={isUpdating}
            >
              <option value="">بدون سائق</option>
              {drivers.filter((driver) => driver.isActive).map((driver) => (
                <option value={driver.id} key={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </label>
        )}
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
              <li className={item.status === order.status ? "active done" : "done"} key={item.id}>
                <strong>{statusLabel(item.status)} · {formatDateTime(item.createdAt)}</strong>
                {item.note ? <small>{item.note}</small> : null}
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
          actions.map((action, index) => (
            <button
              key={action.status}
              type="button"
              className={
                action.status === "cancelled" || action.status === "failed"
                  ? "ghost danger-action"
                  : index === 0
                    ? "primary-action"
                    : "ghost"
              }
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

function cashCollectionLabel(order) {
  if (order.paymentMethod !== "cash") return "-";
  if (order.cashCollectedByDriver) {
    return order.cashCollectedAt ? `تم التحصيل · ${formatDateTime(order.cashCollectedAt)}` : "تم التحصيل";
  }
  return "لم يتم التحصيل بعد";
}

function driverLabel(order, drivers = []) {
  if (order.driverName) return order.driverName;
  return drivers.find((driver) => driver.id === order.driverId)?.name || "-";
}

function nextCompanyActionHint(order) {
  if (!order) return "-";
  const hasDriver = Boolean(order.driverId);

  if (order.status === "pending") return "اقبل الطلب إذا كان قابلًا للتنفيذ، أو ألغِه إذا تعذر التوريد.";
  if (order.status === "accepted" && !hasDriver) return "عيّن سائقًا نشطًا أو اجعل الطلب جاهزًا للتسليم.";
  if (order.status === "accepted" && hasDriver) return "ضع الطلب كجاهز للتسليم بعد انتهاء التجهيز.";
  if (order.status === "assigned") return "تابع السائق حتى يبدأ التوصيل.";
  if (order.status === "en_route") return "تابع التوصيل حتى وصول السائق للعميل.";
  if (order.status === "arrived") return "انتظر تأكيد التسليم أو سجل التعثر إذا لزم.";
  if (order.status === "delivered" && order.paymentMethod === "cash" && !order.cashCollectedByDriver) {
    return "الطلب مكتمل لكن الكاش غير مسجل كمحصل بعد.";
  }
  if (order.status === "delivered") return "الطلب مكتمل ولا يوجد إجراء مطلوب.";
  if (["cancelled", "failed", "rejected"].includes(order.status)) return "راجع السبب داخليًا إذا احتجت متابعة.";
  return "راجع تفاصيل الطلب وحدد الإجراء المناسب.";
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ar-OM");
}
