import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  getCurrentDriverFromSupabase,
  saveDriverLocationInSupabase,
} from "../services/driverService.js";
import {
  claimDriverOrderInSupabase,
  getAvailableOrdersForDriverFromSupabase,
  getOrdersByDriverFromSupabase,
  markDriverCashCollectedInSupabase,
  updateDriverOrderStatusInSupabase,
} from "../services/orderService.js";

const DRIVER_NEXT_ACTIONS = {
  assigned: [{ status: "en_route", label: "بدء التوصيل" }],
  en_route: [{ status: "arrived", label: "وصلت للعميل" }],
  arrived: [{ status: "delivered", label: "تم التسليم" }],
};

const DRIVER_ACTIVE_STATUSES = ["assigned", "en_route", "arrived"];
const ISSUE_REASONS = ["العميل لا يرد", "العنوان غير واضح", "تأخير في التوصيل"];

export default function DriverPage({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
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
    () => orders.filter((order) => DRIVER_ACTIVE_STATUSES.includes(order.status)),
    [orders]
  );

  const currentOrder = activeOrders[0] ?? null;

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
        setAvailableOrders([]);
        setOrders([]);
        setError("حسابك مسجل، لكنه غير مربوط بسائق. تواصل مع الشركة لإكمال الربط.");
        return;
      }

      setDriver(linkedDriver);

      if (!linkedDriver.isActive) {
        setAvailableOrders([]);
        setOrders([]);
        setError("حساب السائق موقوف حاليًا. تواصل مع الشركة لإعادة التفعيل.");
        return;
      }

      const [driverAvailableOrders, assignedOrders] = await Promise.all([
        getAvailableOrdersForDriverFromSupabase(),
        getOrdersByDriverFromSupabase(linkedDriver.id),
      ]);
      setAvailableOrders(driverAvailableOrders);
      setOrders(assignedOrders);
    } catch (loadError) {
      if (import.meta.env.DEV) {
        console.warn("driver_page_load_failed", {
          message: loadError?.message,
          code: loadError?.code,
          details: loadError?.details,
          hint: loadError?.hint,
        });
      }
      setError("تعذر تحميل صفحة السائق حاليًا. حاول مرة أخرى.");
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
        } catch (locationError) {
          if (import.meta.env.DEV) {
            console.warn("driver_location_save_failed", {
              message: locationError?.message,
              code: locationError?.code,
              details: locationError?.details,
              hint: locationError?.hint,
            });
          }
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
    } catch (statusError) {
      if (import.meta.env.DEV) {
        console.warn("driver_order_status_failed", {
          message: statusError?.message,
          code: statusError?.code,
          details: statusError?.details,
          hint: statusError?.hint,
        });
      }
      setError("تعذر تحديث حالة الطلب.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleClaimOrder(order) {
    setUpdatingOrderId(order.rawId);
    setError("");
    setMessage("");

    try {
      const claimedOrder = await claimDriverOrderInSupabase(driver.id, order.rawId);
      setAvailableOrders((currentOrders) => currentOrders.filter((item) => item.rawId !== order.rawId));
      if (claimedOrder) {
        setOrders((currentOrders) => [
          claimedOrder,
          ...currentOrders.filter((item) => item.rawId !== claimedOrder.rawId),
        ]);
      } else {
        const assignedOrders = await getOrdersByDriverFromSupabase(driver.id);
        setOrders(assignedOrders);
      }
      setMessage("تم قبول الطلب وإسناده لك.");
    } catch (claimError) {
      if (import.meta.env.DEV) {
        console.warn("driver_order_claim_failed", {
          message: claimError?.message,
          code: claimError?.code,
          details: claimError?.details,
          hint: claimError?.hint,
        });
      }
      setError("تعذر قبول الطلب. قد يكون تم إسناده لسائق آخر.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleCashCollected(order) {
    setUpdatingOrderId(order.rawId);
    setError("");
    setMessage("");

    try {
      const updatedOrder = await markDriverCashCollectedInSupabase(driver.id, order.rawId);
      setOrders((currentOrders) =>
        currentOrders.map((item) => (item.rawId === updatedOrder.rawId ? updatedOrder : item))
      );
      setMessage("تم تسجيل استلام مبلغ الكاش.");
    } catch (cashError) {
      if (import.meta.env.DEV) {
        console.warn("driver_cash_collection_failed", {
          message: cashError?.message,
          code: cashError?.code,
          details: cashError?.details,
          hint: cashError?.hint,
        });
      }
      setError("تعذر تسجيل تحصيل مبلغ الكاش.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function handleIssueReason(reason) {
    setMessage(`تم تسجيل ملاحظة تشغيلية مؤقتة: ${reason}.`);
    setError("");
  }

  if (loading) {
    return (
      <div className="page driver-page">
        <section className="panel driver-loading-card">
          <p>جاري تحميل بيانات السائق...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page driver-page">
      <header className="page-header compact driver-hero">
        <div>
          <p className="eyebrow">تشغيل التوصيل</p>
          <h1>{driver ? `مرحبًا ${driver.name}` : "دخول السائق"}</h1>
          <p>تابع طلباتك، اقبل الطلبات المتاحة، وحدّث مراحل التوصيل من مكان واحد.</p>
        </div>
        {driver ? (
          <button type="button" className="ghost" onClick={handleSignOut}>
            تسجيل الخروج
          </button>
        ) : null}
      </header>

      {error && <div className="auth-alert error">{error}</div>}
      {message && <div className="auth-alert success">{message}</div>}

      {driver ? (
        <>
          <DriverOperationsSummary
            driver={driver}
            activeCount={activeOrders.length}
            availableCount={availableOrders.length}
            locationState={locationState}
          />

          <TrackingPanel
            driver={driver}
            locationState={locationState}
            currentOrder={currentOrder}
            onShareLocation={handleShareLocation}
          />

          {currentOrder ? (
            <ActiveOrderPanel
              order={currentOrder}
              isUpdating={updatingOrderId === currentOrder.rawId}
              onUpdateStatus={handleUpdateOrderStatus}
              onCashCollected={handleCashCollected}
              onIssueReason={handleIssueReason}
            />
          ) : (
            <section className="driver-active-empty">
              <h2>لا يوجد طلب نشط الآن</h2>
              <p>اقبل طلبًا متاحًا أو انتظر إسناد طلب جديد من الشركة.</p>
            </section>
          )}

          <DriverSection title="طلبات متاحة للاستلام" description="هذه الطلبات غير مسندة وتخص شركتك فقط.">
            {availableOrders.length > 0 ? (
              availableOrders.map((order) => (
                <DriverOrderCard
                  key={order.rawId}
                  order={order}
                  isUpdating={updatingOrderId === order.rawId}
                  variant="available"
                  onClaim={handleClaimOrder}
                />
              ))
            ) : (
              <EmptyDriverCard text="لا توجد طلبات متاحة الآن" />
            )}
          </DriverSection>

          <DriverSection title="طلباتي" description="الطلبات المسندة لك حاليًا أو المنتهية.">
            {orders.length > 0 ? (
              orders.map((order) => (
                <DriverOrderCard
                  key={order.rawId}
                  order={order}
                  isActive={currentOrder?.rawId === order.rawId}
                  isUpdating={updatingOrderId === order.rawId}
                  variant="assigned"
                  onUpdateStatus={handleUpdateOrderStatus}
                  onCashCollected={handleCashCollected}
                />
              ))
            ) : (
              <EmptyDriverCard text="لا توجد طلبات مسندة لك" />
            )}
          </DriverSection>
        </>
      ) : (
        <section className="driver-active-empty">
          <h2>لا توجد جلسة سائق جاهزة</h2>
          <p>سجّل الدخول من رابط الدعوة أو تواصل مع الشركة لربط حسابك بسجل سائق.</p>
          <button type="button" onClick={() => onNavigate?.("/driver/login")}>
            فتح صفحة الدخول
          </button>
        </section>
      )}
    </div>
  );
}

function DriverOperationsSummary({ driver, activeCount, availableCount, locationState }) {
  return (
    <section className="driver-ops-summary" aria-label="ملخص السائق">
      <SummaryTile label="السائق" value={driver.name || "غير محدد"} note={driver.companyName || "الشركة غير محددة"} />
      <SummaryTile label="الحالة" value={driver.isActive ? "نشط" : "غير نشط"} note={driver.profileId ? "مربوط بحساب دخول" : "غير مربوط"} />
      <SummaryTile label="طلباتي الحالية" value={activeCount} note="طلبات قيد التشغيل" />
      <SummaryTile label="طلبات متاحة" value={availableCount} note="جاهزة للاستلام" />
      <SummaryTile label="التتبع" value={trackingLabel(locationState.status)} note="يبدأ عند مشاركة الموقع" />
    </section>
  );
}

function SummaryTile({ label, value, note }) {
  return (
    <article className="driver-summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

function TrackingPanel({ driver, locationState, currentOrder, onShareLocation }) {
  const canShareLocation = driver?.isActive && Boolean(currentOrder);

  return (
    <section className="driver-tracking-panel">
      <div>
        <p className="eyebrow">التتبع</p>
        <h2>{locationState.status === "shared" ? "التتبع نشط" : "التتبع غير نشط"}</h2>
        <p>
          {currentOrder
            ? "يمكنك مشاركة موقعك بعد بدء العمل على الطلب الحالي."
            : "يبدأ التتبع عند وجود طلب نشط للسائق."}
        </p>
      </div>
      <button
        type="button"
        className="ghost"
        onClick={onShareLocation}
        disabled={!canShareLocation || locationState.status === "requesting"}
      >
        {locationState.status === "requesting" ? "جاري تحديد الموقع..." : "مشاركة موقعي الآن"}
      </button>
      {locationState.status === "shared" ? (
        <dl>
          <div>
            <dt>آخر تحديث</dt>
            <dd>{formatDate(locationState.recordedAt)}</dd>
          </div>
          <div>
            <dt>الدقة</dt>
            <dd>{locationState.accuracy ? `${Math.round(locationState.accuracy)} متر` : "غير محددة"}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

function ActiveOrderPanel({ order, isUpdating, onUpdateStatus, onCashCollected, onIssueReason }) {
  const phoneLink = phoneHref(order.phone);
  const whatsappLink = whatsappHref(order.phone);
  const mapLink = mapsHref(order);
  const actions = DRIVER_NEXT_ACTIONS[order.status] ?? [];
  const canCollectCash =
    order.paymentMethod === "cash" &&
    order.status === "delivered" &&
    !order.cashCollectedByDriver;

  return (
    <section className="driver-active-order">
      <div className="driver-active-head">
        <div>
          <p className="eyebrow">الطلب النشط</p>
          <h2>{order.publicCode || shortId(order.rawId)}</h2>
          <p>{statusLabel(order.status)}</p>
        </div>
        <span className={`status ${order.status}`}>{statusLabel(order.status)}</span>
      </div>

      <div className="driver-customer-actions">
        <div>
          <span>العميل</span>
          <strong>{order.customer || "عميل غير محدد"}</strong>
          <small>{order.phone || "رقم الهاتف غير متوفر"}</small>
        </div>
        {phoneLink ? <a className="driver-action-link" href={phoneLink}>اتصال</a> : null}
        {whatsappLink ? <a className="driver-action-link" href={whatsappLink} target="_blank" rel="noreferrer">واتساب</a> : null}
      </div>

      <div className="driver-address-block">
        <span>العنوان</span>
        <strong>{order.area || "المنطقة غير محددة"}</strong>
        <p>{order.address || "العنوان النصي فقط"}</p>
        {mapLink ? (
          <a className="driver-map-link" href={mapLink} target="_blank" rel="noreferrer">فتح الخريطة</a>
        ) : (
          <small>العنوان النصي فقط</small>
        )}
      </div>

      <OrderItemsList items={order.items} />

      <PaymentPanel order={order} highlighted />

      <div className="driver-workflow-actions">
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={isUpdating}
            onClick={() => onUpdateStatus(order, action.status)}
          >
            {isUpdating ? "جاري التحديث..." : action.label}
          </button>
        ))}
        {canCollectCash ? (
          <button type="button" className="cash" disabled={isUpdating} onClick={() => onCashCollected(order)}>
            {isUpdating ? "جاري التحديث..." : "تم استلام المبلغ"}
          </button>
        ) : null}
      </div>

      <div className="driver-issue-actions">
        <span>مشاكل الطلب</span>
        {ISSUE_REASONS.map((reason) => (
          <button type="button" className="ghost" key={reason} onClick={() => onIssueReason(reason)}>
            {reason}
          </button>
        ))}
      </div>
    </section>
  );
}

function DriverSection({ title, description, children }) {
  return (
    <section className="driver-section">
      <header>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="driver-orders">{children}</div>
    </section>
  );
}

function DriverOrderCard({ order, isActive, isUpdating, variant, onClaim, onUpdateStatus, onCashCollected }) {
  const isClaimable = variant === "available";
  const actions = DRIVER_NEXT_ACTIONS[order.status] ?? [];
  const canCollectCash =
    !isClaimable &&
    order.paymentMethod === "cash" &&
    order.status === "delivered" &&
    !order.cashCollectedByDriver;

  return (
    <article className={isActive ? "mobile-order-card driver-current-card" : "mobile-order-card"}>
      <div className="mobile-order-head">
        <strong>{order.publicCode || shortId(order.rawId)}</strong>
        <span className={`status ${order.status}`}>{statusLabel(order.status)}</span>
      </div>

      <h3>{order.area || "المنطقة غير محددة"}</h3>
      <p>{order.address || "العنوان النصي غير مكتمل"}</p>

      <div className="driver-card-metrics">
        <Metric label="المبلغ" value={formatMoney(order.amount)} />
        <Metric label="الدفع" value={paymentShortLabel(order)} />
        <Metric label="المنتجات" value={order.items?.length || 0} />
        <Metric label="وقت الطلب" value={order.time || formatDate(order.createdAt)} />
      </div>

      <OrderItemsList items={order.items} compact />

      {!isClaimable ? <PaymentPanel order={order} /> : null}

      {isClaimable ? (
        <div className="driver-actions single">
          <button type="button" disabled={isUpdating} onClick={() => onClaim?.(order)}>
            {isUpdating ? "جاري قبول الطلب..." : "قبول الطلب"}
          </button>
        </div>
      ) : null}

      {!isClaimable && actions.length > 0 && (
        <div className="driver-actions">
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdateStatus?.(order, action.status)}
            >
              {isUpdating ? "جاري التحديث..." : action.label}
            </button>
          ))}
        </div>
      )}

      {canCollectCash ? (
        <div className="driver-actions single">
          <button type="button" className="cash" disabled={isUpdating} onClick={() => onCashCollected?.(order)}>
            {isUpdating ? "جاري التحديث..." : "تم استلام المبلغ"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OrderItemsList({ items = [], compact = false }) {
  if (!items.length) {
    return <p className="empty-note">لا توجد منتجات مفصلة لهذا الطلب.</p>;
  }

  return (
    <div className={compact ? "order-items-list compact" : "order-items-list"}>
      {items.map((item) => (
        <div className="order-item-row" key={item.id}>
          <span>{item.name}</span>
          <strong>
            {item.quantity} × {formatMoney(item.unitPrice)}
          </strong>
        </div>
      ))}
    </div>
  );
}

function PaymentPanel({ order, highlighted = false }) {
  const isCash = order.paymentMethod === "cash";

  return (
    <div className={highlighted && isCash ? "driver-payment-panel cash-due" : "driver-payment-panel"}>
      <span>الدفع</span>
      <strong>{isCash ? "الدفع كاش عند الاستلام" : paymentLabel(order)}</strong>
      <p>{isCash ? `المبلغ المطلوب تحصيله: ${formatMoney(order.amount)}` : `حالة الدفع: ${order.paymentStatus || "غير محددة"}`}</p>
      <small>{order.cashCollectedByDriver ? "تم تحصيل الكاش" : "الكاش غير محصل"}</small>
    </div>
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
    arrived: "وصل للعميل",
    delivered: "تم التسليم",
    failed: "تعذر التوصيل",
    cancelled: "ملغي",
    rejected: "مرفوض",
  };

  return labels[status] ?? status ?? "غير محدد";
}

function trackingLabel(status) {
  const labels = {
    idle: "غير نشط",
    requesting: "جاري التحديد",
    shared: "نشط",
    denied: "مرفوض",
  };
  return labels[status] ?? "غير نشط";
}

function shortId(id) {
  return id ? `#${String(id).slice(0, 8)}` : "بدون رقم";
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return `${amount.toFixed(3)} ر.ع`;
}

function paymentShortLabel(order) {
  if (order.paymentMethod === "cash") return "كاش";
  return order.paymentMethod || "غير محدد";
}

function paymentLabel(order) {
  if (order.paymentMethod !== "cash") {
    return `${order.paymentMethod || "غير محدد"} / ${order.paymentStatus || "غير محدد"}`;
  }

  if (order.cashCollectedByDriver) {
    return "كاش / تم التحصيل";
  }

  return "كاش / غير محصل";
}

function phoneHref(phone) {
  const normalized = normalizePhone(phone);
  return normalized ? `tel:${normalized}` : null;
}

function whatsappHref(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const omanNumber = normalized.startsWith("+") ? normalized.replace("+", "") : `968${normalized.replace(/^0+/, "")}`;
  return `https://wa.me/${omanNumber}`;
}

function normalizePhone(phone) {
  if (!phone) return "";
  const text = String(phone).trim();
  const cleaned = text.replace(/[^\d+]/g, "");
  return cleaned.length >= 6 ? cleaned : "";
}

function mapsHref(order) {
  if (order.deliveryLat && order.deliveryLng) {
    return `https://www.google.com/maps?q=${encodeURIComponent(`${order.deliveryLat},${order.deliveryLng}`)}`;
  }
  return null;
}

function formatDate(value) {
  if (!value) return "غير محدد";
  return new Date(value).toLocaleString("ar-OM", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
