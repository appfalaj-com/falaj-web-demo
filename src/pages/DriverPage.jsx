import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  getCurrentDriverFromSupabase,
  saveDriverLocationInSupabase,
} from "../services/driverService.js";
import {
  getOrdersByDriverFromSupabase,
  updateDriverOrderStatusInSupabase,
} from "../services/orderService.js";

const DRIVER_NEXT_ACTIONS = {
  assigned: [{ status: "en_route", label: "بدء التوصيل" }],
  en_route: [
    { status: "arrived", label: "وصلت للموقع" },
    { status: "failed", label: "تعذر التوصيل" },
  ],
  arrived: [
    { status: "delivered", label: "تم التسليم" },
    { status: "failed", label: "تعذر التوصيل" },
  ],
};

export default function DriverPage({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState(null);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [locationState, setLocationState] = useState({
    status: "idle",
    latitude: null,
    longitude: null,
    accuracy: null,
    recordedAt: null,
  });
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    loadDriverContext();
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((order) => !["delivered", "failed", "cancelled", "rejected"].includes(order.status)),
    [orders]
  );

  async function loadDriverContext() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { user, driver: linkedDriver } = await getCurrentDriverFromSupabase();
      if (!user) {
        onNavigate?.("/driver/login");
        return;
      }

      if (!linkedDriver) {
        setDriver(null);
        setOrders([]);
        setError("حسابك غير مربوط بسائق. تواصل مع الشركة.");
        return;
      }

      setDriver(linkedDriver);

      if (!linkedDriver.isActive) {
        setOrders([]);
        setError("حساب السائق موقوف حاليًا.");
        return;
      }

      const assignedOrders = await getOrdersByDriverFromSupabase(linkedDriver.id);
      setOrders(assignedOrders);
    } catch {
      setError("تعذر تحميل بيانات السائق.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase?.auth.signOut();
    onNavigate?.("/driver/login");
  }

  async function handleShareLocation() {
    setError("");
    setMessage("");

    if (!driver?.id || !driver?.isActive) {
      setError("لا يمكن حفظ الموقع إلا لسائق مربوط ونشط.");
      return;
    }

    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم مشاركة الموقع.");
      return;
    }

    setLocationState((current) => ({ ...current, status: "requesting" }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        try {
          const savedLocation = await saveDriverLocationInSupabase(driver, coords);
          setLocationState({
            status: "shared",
            latitude: Number(savedLocation.latitude),
            longitude: Number(savedLocation.longitude),
            accuracy: savedLocation.accuracy,
            recordedAt: savedLocation.recorded_at,
          });
          setMessage("تم حفظ موقعك الحالي بنجاح.");
        } catch {
          setLocationState((current) => ({ ...current, status: "idle" }));
          setError("تعذر حفظ موقع السائق.");
        }
      },
      (geoError) => {
        setLocationState((current) => ({ ...current, status: "denied" }));
        setError(geoError?.message || "تم رفض صلاحية الموقع أو تعذر تحديده.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function handleUpdateOrderStatus(order, nextStatus) {
    setUpdatingOrderId(order.rawId);
    setError("");
    setMessage("");

    try {
      const updatedOrder = await updateDriverOrderStatusInSupabase(driver.id, order.rawId, nextStatus);
      setOrders((currentOrders) =>
        currentOrders.map((item) => (item.rawId === updatedOrder.rawId ? updatedOrder : item))
      );
      setMessage("تم تحديث حالة الطلب.");
    } catch {
      setError("تعذر تحديث حالة الطلب.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (loading) {
    return (
      <div className="page driver-page">
        <section className="panel">
          <p>جاري تحميل بيانات السائق...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page driver-page">
      <header className="page-header compact">
        <div>
          <p className="eyebrow">واجهة السائق</p>
          <h1>{driver ? `مرحبًا ${driver.name}` : "دخول السائق"}</h1>
          <p>إدارة الطلبات المسندة ومشاركة الموقع تتم فقط للحساب المرتبط بسائق نشط.</p>
        </div>
        <button type="button" className="ghost" onClick={handleSignOut}>
          تسجيل الخروج
        </button>
      </header>

      {error && <div className="auth-alert error">{error}</div>}
      {message && <div className="auth-alert success">{message}</div>}

      {driver && (
        <>
          <section className="panel overview">
            <div className="driver-card-head">
              <div>
                <h2>بيانات السائق</h2>
                <p>{driver.companyName || "الشركة غير محددة"}</p>
              </div>
              <span className={`status ${driver.isActive ? "approved" : "inactive"}`}>
                {driver.isActive ? "نشط" : "موقوف"}
              </span>
            </div>
            <dl className="supplier-detail-list">
              <div>
                <dt>الاسم</dt>
                <dd>{driver.name || "غير محدد"}</dd>
              </div>
              <div>
                <dt>الهاتف</dt>
                <dd>{driver.phone || "غير محدد"}</dd>
              </div>
              <div>
                <dt>حالة الربط</dt>
                <dd>{driver.profileId ? "مربوط بحساب دخول" : "غير مربوط بحساب دخول"}</dd>
              </div>
              <div>
                <dt>الشركة</dt>
                <dd>{driver.companyName || driver.companyId || "غير محددة"}</dd>
              </div>
            </dl>
          </section>

          {driver.isActive && (
            <section className="panel overview">
              <div className="driver-card-head">
                <div>
                  <h2>مشاركة الموقع</h2>
                  <p>لن يتم حفظ الموقع إلا بعد ضغط الزر ومنح إذن GPS من المتصفح.</p>
                </div>
                <button
                  type="button"
                  onClick={handleShareLocation}
                  disabled={locationState.status === "requesting"}
                >
                  {locationState.status === "requesting" ? "جاري تحديد الموقع..." : "بدء مشاركة الموقع"}
                </button>
              </div>
              {locationState.status === "shared" ? (
                <dl className="supplier-detail-list">
                  <div>
                    <dt>خط العرض</dt>
                    <dd>{locationState.latitude?.toFixed(6)}</dd>
                  </div>
                  <div>
                    <dt>خط الطول</dt>
                    <dd>{locationState.longitude?.toFixed(6)}</dd>
                  </div>
                  <div>
                    <dt>الدقة</dt>
                    <dd>{locationState.accuracy ? `${Math.round(locationState.accuracy)} متر` : "غير محددة"}</dd>
                  </div>
                  <div>
                    <dt>آخر تحديث</dt>
                    <dd>{formatDate(locationState.recordedAt)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="empty-note">الإذن مطلوب قبل حفظ موقع السائق الحالي.</p>
              )}
            </section>
          )}

          <DriverSection title="الطلبات المسندة">
            {orders.length > 0 ? (
              orders.map((order) => (
                <DriverOrderCard
                  key={order.rawId}
                  order={order}
                  isActive={activeOrders.some((item) => item.rawId === order.rawId)}
                  isUpdating={updatingOrderId === order.rawId}
                  onUpdateStatus={handleUpdateOrderStatus}
                />
              ))
            ) : (
              <EmptyDriverCard text="لا توجد طلبات مسندة حاليًا." />
            )}
          </DriverSection>
        </>
      )}
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

function DriverOrderCard({ order, isActive, isUpdating, onUpdateStatus }) {
  const actions = DRIVER_NEXT_ACTIONS[order.status] ?? [];

  return (
    <article className={isActive ? "mobile-order-card driver-current-card" : "mobile-order-card"}>
      <div className="mobile-order-head">
        <strong>{order.publicCode || shortId(order.rawId)}</strong>
        <span className={`status ${order.status}`}>{statusLabel(order.status)}</span>
      </div>

      <h3>{order.customer || "عميل غير محدد"}</h3>
      <p>{[order.area, order.address].filter(Boolean).join(" - ") || "العنوان غير محدد"}</p>

      <div className="order-detail-row">
        <span>نوع المياه</span>
        <strong>{order.waterType || "غير محدد"}</strong>
      </div>
      <div className="order-detail-row">
        <span>الكمية</span>
        <strong>{order.volumeLiters ? `${order.volumeLiters} لتر` : "غير محددة"}</strong>
      </div>
      <div className="order-detail-row">
        <span>الدفع</span>
        <strong>{order.paymentMethod || "غير محدد"} / {order.paymentStatus || "غير محدد"}</strong>
      </div>
      <div className="order-detail-row">
        <span>الإجمالي</span>
        <strong>{formatMoney(order.amount)}</strong>
      </div>
      <div className="order-detail-row">
        <span>تاريخ الطلب</span>
        <strong>{formatDate(order.createdAt)}</strong>
      </div>

      {actions.length > 0 && (
        <div className="driver-actions">
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              className={action.status === "failed" ? "ghost danger-action" : undefined}
              disabled={isUpdating}
              onClick={() => onUpdateStatus(order, action.status)}
            >
              {isUpdating ? "جاري التحديث..." : action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function EmptyDriverCard({ text }) {
  return (
    <article className="mobile-order-card empty-driver-card">
      <p>{text}</p>
    </article>
  );
}

function statusLabel(status) {
  const labels = {
    pending: "جديد",
    accepted: "مقبول",
    assigned: "مسند",
    en_route: "في الطريق",
    arrived: "وصل",
    delivered: "تم التسليم",
    failed: "تعذر التوصيل",
    cancelled: "ملغي",
    rejected: "مرفوض",
  };

  return labels[status] ?? status ?? "غير محدد";
}

function shortId(id) {
  return id ? `#${String(id).slice(0, 8)}` : "بدون رقم";
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return `${amount.toFixed(3)} ر.ع`;
}

function formatDate(value) {
  if (!value) return "غير محدد";
  return new Date(value).toLocaleString("ar-OM", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
