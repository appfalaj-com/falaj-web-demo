import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  PackagePlus,
  Phone,
  Radio,
  Route,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import RealtimeNotificationCenter from "../components/RealtimeNotificationCenter.jsx";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh.js";
import { useI18n } from "../i18n/I18nProvider.jsx";
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

const DRIVER_NEXT_STATUS = {
  assigned: "en_route",
  en_route: "arrived",
  arrived: "delivered",
};

const DRIVER_ACTIVE_STATUSES = ["assigned", "en_route", "arrived"];
const DRIVER_COMPLETED_STATUSES = ["delivered", "failed", "cancelled", "rejected"];
const DRIVER_TRACKING_STATUSES = ["en_route", "arrived"];
const LOCATION_SAVE_MIN_INTERVAL_MS = 15000;
const LOCATION_SAVE_MIN_MOVEMENT_METERS = 25;
const ISSUE_REASON_KEYS = ["customerNoAnswer", "unclearAddress", "deliveryDelay"];

const DRIVER_COPY = {
  ar: {
    loading: "جاري تجهيز مساحة العمل...",
    brandSubtitle: "مساحة السائق",
    signOut: "تسجيل الخروج",
    welcome: "أهلًا بعودتك",
    ready: "جاهز للتوصيل",
    inactive: "الحساب غير نشط",
    currentTask: "مهمتك الحالية",
    noActiveTitle: "لا يوجد طلب نشط الآن",
    noActiveText: "عند إسناد طلب جديد سيظهر هنا مباشرة مع كل تفاصيل التوصيل.",
    noSessionTitle: "لا توجد جلسة سائق جاهزة",
    noSessionText: "سجّل الدخول من رابط الدعوة أو تواصل مع الشركة لربط حسابك بسجل سائق.",
    openLogin: "فتح صفحة الدخول",
    available: "متاحة",
    assigned: "المسندة",
    completed: "مكتملة",
    tracking: "التتبع",
    orders: "الطلبات",
    order: "الطلب",
    customer: "العميل",
    address: "عنوان التوصيل",
    products: "المنتجات",
    productCount: "عدد المنتجات",
    orderTime: "وقت الطلب",
    amount: "المبلغ",
    payment: "الدفع",
    cash: "كاش",
    cashOnDelivery: "الدفع نقدًا عند الاستلام",
    cashDue: "المطلوب تحصيله",
    cashCollected: "تم تحصيل المبلغ",
    cashNotCollected: "لم يتم تحصيل المبلغ",
    paymentStatus: "حالة الدفع",
    call: "اتصال بالعميل",
    whatsapp: "مراسلة عبر واتساب",
    openMap: "فتح الخريطة",
    textAddressOnly: "العنوان متوفر كنص فقط",
    locationActive: "الموقع مباشر",
    locationInactive: "الموقع متوقف",
    locationStarting: "جاري تحديد الموقع...",
    shareLocation: "تشغيل مشاركة الموقع",
    locationStartsAfterDelivery: "يبدأ التتبع تلقائيًا بعد بدء التوصيل",
    lastUpdate: "آخر تحديث",
    accuracy: "الدقة",
    meter: "متر",
    orderDetails: "تفاصيل الطلب",
    reportIssue: "الإبلاغ عن مشكلة",
    issueHelp: "اختر السبب وسيتم تسجيله على الطلب",
    acceptOrder: "قبول الطلب",
    acceptingOrder: "جاري قبول الطلب...",
    updating: "جاري التحديث...",
    collectCash: "تأكيد استلام المبلغ",
    noAvailable: "لا توجد طلبات متاحة الآن",
    noAssigned: "لا توجد طلبات أخرى مسندة لك",
    noCompleted: "لا توجد توصيلات مكتملة بعد",
    unspecifiedCustomer: "عميل غير محدد",
    noPhone: "رقم الهاتف غير متوفر",
    unspecifiedArea: "المنطقة غير محددة",
    incompleteAddress: "تفاصيل العنوان غير مكتملة",
    noItems: "لا توجد منتجات مفصلة لهذا الطلب.",
    unspecified: "غير محدد",
    noNumber: "بدون رقم",
    linkedAccount: "مرتبط بحساب الدخول",
    nextActions: {
      en_route: "بدء التوصيل",
      arrived: "وصلت إلى العميل",
      delivered: "تأكيد التسليم",
    },
    statuses: {
      pending: "جديد",
      accepted: "مقبول",
      assigned: "مسند",
      en_route: "في الطريق",
      arrived: "عند العميل",
      delivered: "تم التسليم",
      failed: "تعذر التوصيل",
      cancelled: "ملغي",
      rejected: "مرفوض",
    },
    issueReasons: {
      customerNoAnswer: "العميل لا يرد",
      unclearAddress: "العنوان غير واضح",
      deliveryDelay: "تأخير في التوصيل",
    },
    messages: {
      locationUnavailable: "الموقع غير متاح على هذا الجهاز. يمكنك متابعة الطلب بدون تتبع مباشر.",
      trackingUnavailable: "يمكنك متابعة الطلب، لكن التتبع المباشر غير متاح على هذا الجهاز.",
      locationSaveWarning: "تعذر حفظ آخر موقع، ويمكنك متابعة التوصيل بدون توقف.",
      locationDenied: "لم يتم السماح بمشاركة الموقع. يمكنك المحاولة مرة أخرى من زر التتبع.",
      trackingDisabled: "تم تعطيل التتبع المباشر، لكن مسار الطلب لا يزال يعمل.",
      unlinked: "حسابك مسجل، لكنه غير مربوط بسائق. تواصل مع الشركة لإكمال الربط.",
      suspended: "حساب السائق موقوف حاليًا. تواصل مع الشركة لإعادة التفعيل.",
      loadFailed: "تعذر تحميل صفحة السائق حاليًا. حاول مرة أخرى.",
      trackingAfterStart: "يبدأ التتبع المباشر بعد بدء التوصيل.",
      activeDriverRequired: "لا يمكن حفظ الموقع إلا لسائق مربوط ونشط.",
      browserLocationUnsupported: "المتصفح لا يدعم مشاركة الموقع.",
      locationSaved: "تم حفظ موقعك الحالي بنجاح.",
      locationSaveFailed: "تعذر حفظ موقع السائق.",
      locationPermissionFailed: "تم رفض صلاحية الموقع أو تعذر تحديده.",
      statusUpdated: "تم تحديث حالة الطلب.",
      statusUpdateFailed: "تعذر تحديث حالة الطلب.",
      orderClaimed: "تم قبول الطلب وإسناده لك.",
      orderClaimFailed: "تعذر قبول الطلب. قد يكون تم إسناده لسائق آخر.",
      cashRecorded: "تم تسجيل استلام مبلغ الكاش.",
      cashRecordFailed: "تعذر تسجيل تحصيل مبلغ الكاش.",
      issueRecorded: "تم تسجيل الملاحظة: {reason}.",
    },
  },
  en: {
    loading: "Preparing your workspace...",
    brandSubtitle: "Driver workspace",
    signOut: "Sign out",
    welcome: "Welcome back",
    ready: "Ready to deliver",
    inactive: "Account inactive",
    currentTask: "Your current task",
    noActiveTitle: "No active delivery",
    noActiveText: "A new assignment will appear here with everything you need to complete it.",
    noSessionTitle: "No driver session is ready",
    noSessionText: "Sign in from your invitation link or contact the company to link your account.",
    openLogin: "Open sign in",
    available: "Available",
    assigned: "Assigned",
    completed: "Completed",
    tracking: "Tracking",
    orders: "Orders",
    order: "Order",
    customer: "Customer",
    address: "Delivery address",
    products: "Products",
    productCount: "Products",
    orderTime: "Order time",
    amount: "Amount",
    payment: "Payment",
    cash: "Cash",
    cashOnDelivery: "Cash on delivery",
    cashDue: "Amount to collect",
    cashCollected: "Cash collected",
    cashNotCollected: "Cash not collected",
    paymentStatus: "Payment status",
    call: "Call customer",
    whatsapp: "Message on WhatsApp",
    openMap: "Open map",
    textAddressOnly: "Text address only",
    locationActive: "Live location on",
    locationInactive: "Location off",
    locationStarting: "Finding your location...",
    shareLocation: "Start location sharing",
    locationStartsAfterDelivery: "Tracking starts automatically when delivery begins",
    lastUpdate: "Last update",
    accuracy: "Accuracy",
    meter: "m",
    orderDetails: "Order details",
    reportIssue: "Report an issue",
    issueHelp: "Choose a reason and it will be logged on the order",
    acceptOrder: "Accept order",
    acceptingOrder: "Accepting order...",
    updating: "Updating...",
    collectCash: "Confirm cash received",
    noAvailable: "No available orders right now",
    noAssigned: "No other orders are assigned to you",
    noCompleted: "No completed deliveries yet",
    unspecifiedCustomer: "Customer not specified",
    noPhone: "Phone number unavailable",
    unspecifiedArea: "Area not specified",
    incompleteAddress: "Address details are incomplete",
    noItems: "No item details are available for this order.",
    unspecified: "Not specified",
    noNumber: "No number",
    linkedAccount: "Linked to your login",
    nextActions: {
      en_route: "Start delivery",
      arrived: "I've arrived",
      delivered: "Confirm delivery",
    },
    statuses: {
      pending: "New",
      accepted: "Accepted",
      assigned: "Assigned",
      en_route: "On the way",
      arrived: "At customer",
      delivered: "Delivered",
      failed: "Delivery failed",
      cancelled: "Cancelled",
      rejected: "Rejected",
    },
    issueReasons: {
      customerNoAnswer: "Customer is not answering",
      unclearAddress: "Address is unclear",
      deliveryDelay: "Delivery delay",
    },
    messages: {
      locationUnavailable: "Location is unavailable on this device. You can continue without live tracking.",
      trackingUnavailable: "You can continue the order, but live tracking is unavailable on this device.",
      locationSaveWarning: "The latest location could not be saved. You can continue the delivery.",
      locationDenied: "Location permission was not granted. Try again from the tracking control.",
      trackingDisabled: "Live tracking is off, but the order workflow is still available.",
      unlinked: "Your account is registered but is not linked to a driver. Contact your company.",
      suspended: "This driver account is currently suspended. Contact your company to reactivate it.",
      loadFailed: "The driver workspace could not be loaded. Please try again.",
      trackingAfterStart: "Live tracking starts after you begin the delivery.",
      activeDriverRequired: "Location can only be saved for a linked, active driver.",
      browserLocationUnsupported: "This browser does not support location sharing.",
      locationSaved: "Your current location was saved.",
      locationSaveFailed: "The driver location could not be saved.",
      locationPermissionFailed: "Location permission was denied or your position could not be found.",
      statusUpdated: "Order status updated.",
      statusUpdateFailed: "The order status could not be updated.",
      orderClaimed: "The order was accepted and assigned to you.",
      orderClaimFailed: "The order could not be accepted. Another driver may have claimed it.",
      cashRecorded: "Cash collection was recorded.",
      cashRecordFailed: "Cash collection could not be recorded.",
      issueRecorded: "Issue noted: {reason}.",
    },
  },
};

export default function DriverPage({ onNavigate }) {
  const { language } = useI18n();
  const copy = DRIVER_COPY[language] ?? DRIVER_COPY.ar;
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeList, setActiveList] = useState("available");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [locationState, setLocationState] = useState({
    status: "idle",
    latitude: null,
    longitude: null,
    accuracy: null,
    heading: null,
    speed: null,
    recordedAt: null,
    warning: "",
  });
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const watchIdRef = useRef(null);
  const lastSavedLocationRef = useRef(null);

  useEffect(() => {
    loadDriverContext();
  }, []);

  useRealtimeRefresh(
    () => loadDriverContext({ silent: true }),
    ["orders"]
  );

  const activeOrders = useMemo(
    () => orders.filter((order) => DRIVER_ACTIVE_STATUSES.includes(order.status)),
    [orders]
  );

  const currentOrder = activeOrders[0] ?? null;
  const completedOrders = useMemo(
    () => orders.filter((order) => DRIVER_COMPLETED_STATUSES.includes(order.status)),
    [orders]
  );
  const assignedOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          !DRIVER_COMPLETED_STATUSES.includes(order.status) &&
          order.rawId !== currentOrder?.rawId
      ),
    [currentOrder?.rawId, orders]
  );

  const stopForegroundTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    lastSavedLocationRef.current = null;
    setLocationState((current) =>
      current.status === "watching" || current.status === "shared" || current.status === "requesting"
        ? { ...current, status: "idle" }
        : current
    );
  }, []);

  const startForegroundTracking = useCallback(
    (order = currentOrder, options = {}) => {
      if (!driver?.id || !driver?.isActive || !order || !DRIVER_TRACKING_STATUSES.includes(order.status)) {
        return;
      }

      if (!navigator.geolocation) {
        setLocationState((current) => ({
          ...current,
          status: "unavailable",
          warning: copy.messages.locationUnavailable,
        }));
        if (!options.silent) {
          setMessage(copy.messages.trackingUnavailable);
        }
        return;
      }

      if (watchIdRef.current !== null) {
        return;
      }

      setLocationState((current) => ({ ...current, status: "requesting", warning: "" }));
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const coords = normalizePositionCoords(position);
          if (!coords) return;

          setLocationState({
            status: "shared",
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
            recordedAt: new Date(position.timestamp || Date.now()).toISOString(),
            warning: "",
          });

          if (!shouldSaveLocation(coords, lastSavedLocationRef.current)) return;

          try {
            const savedLocation = await saveDriverLocationInSupabase(driver, coords, order);
            lastSavedLocationRef.current = {
              latitude: coords.latitude,
              longitude: coords.longitude,
              savedAt: Date.now(),
            };
            setLocationState((current) => ({
              ...current,
              status: "shared",
              latitude: Number(savedLocation.latitude),
              longitude: Number(savedLocation.longitude),
              accuracy: savedLocation.accuracy,
              heading: savedLocation.heading,
              speed: savedLocation.speed,
              recordedAt: savedLocation.recorded_at,
              warning: "",
            }));
          } catch (locationError) {
            if (import.meta.env.DEV) {
              console.warn("driver_location_save_failed", {
                stage: "foreground_watch",
                message: locationError?.message,
                code: locationError?.code,
              });
            }
            setLocationState((current) => ({
              ...current,
              status: "shared",
              warning: copy.messages.locationSaveWarning,
            }));
          }
        },
        () => {
          if (watchIdRef.current !== null && navigator.geolocation?.clearWatch) {
            navigator.geolocation.clearWatch(watchIdRef.current);
          }
          watchIdRef.current = null;
          setLocationState((current) => ({
            ...current,
            status: "denied",
            warning: copy.messages.locationDenied,
          }));
          if (!options.silent) {
            setMessage(copy.messages.trackingDisabled);
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );
    },
    [copy, currentOrder, driver]
  );

  useEffect(() => () => stopForegroundTracking(), [stopForegroundTracking]);

  useEffect(() => {
    if (!driver?.id || !currentOrder || !DRIVER_TRACKING_STATUSES.includes(currentOrder.status)) {
      stopForegroundTracking();
      return;
    }
    startForegroundTracking(currentOrder, { silent: true });
  }, [currentOrder?.rawId, currentOrder?.status, driver?.id, startForegroundTracking, stopForegroundTracking]);

  async function loadDriverContext(options = {}) {
    if (!options.silent) {
      setLoading(true);
      setError("");
      setMessage("");
    }

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
        setError(copy.messages.unlinked);
        return;
      }

      setDriver(linkedDriver);

      if (!linkedDriver.isActive) {
        setAvailableOrders([]);
        setOrders([]);
        setError(copy.messages.suspended);
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
      if (!options.silent) {
        setError(copy.messages.loadFailed);
      }
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }

  async function handleSignOut() {
    stopForegroundTracking();
    await supabase?.auth.signOut();
    onNavigate?.("/driver/login");
  }

  async function handleShareLocation() {
    setError("");
    setMessage("");

    if (driver?.id && driver?.isActive && currentOrder && DRIVER_TRACKING_STATUSES.includes(currentOrder.status)) {
      startForegroundTracking(currentOrder);
      return;
    }

    if (driver?.id && driver?.isActive) {
      setMessage(copy.messages.trackingAfterStart);
      return;
    }

    if (!driver?.id || !driver?.isActive) {
      setError(copy.messages.activeDriverRequired);
      return;
    }

    if (!navigator.geolocation) {
      setError(copy.messages.browserLocationUnsupported);
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
          setMessage(copy.messages.locationSaved);
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
          setError(copy.messages.locationSaveFailed);
        }
      },
      (geoError) => {
        setLocationState((current) => ({ ...current, status: "denied" }));
        setError(geoError?.message || copy.messages.locationPermissionFailed);
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
      if (DRIVER_TRACKING_STATUSES.includes(updatedOrder.status)) {
        startForegroundTracking(updatedOrder, { silent: true });
      } else if (DRIVER_COMPLETED_STATUSES.includes(updatedOrder.status)) {
        stopForegroundTracking();
      }
      setOrders((currentOrders) =>
        currentOrders.map((item) => (item.rawId === updatedOrder.rawId ? updatedOrder : item))
      );
      setMessage(copy.messages.statusUpdated);
    } catch (statusError) {
      if (import.meta.env.DEV) {
        console.warn("driver_order_status_failed", {
          message: statusError?.message,
          code: statusError?.code,
          details: statusError?.details,
          hint: statusError?.hint,
        });
      }
      setError(copy.messages.statusUpdateFailed);
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
      setMessage(copy.messages.orderClaimed);
    } catch (claimError) {
      if (import.meta.env.DEV) {
        console.warn("driver_order_claim_failed", {
          message: claimError?.message,
          code: claimError?.code,
          details: claimError?.details,
          hint: claimError?.hint,
        });
      }
      setError(copy.messages.orderClaimFailed);
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
      stopForegroundTracking();
      setOrders((currentOrders) =>
        currentOrders.map((item) => (item.rawId === updatedOrder.rawId ? updatedOrder : item))
      );
      setMessage(copy.messages.cashRecorded);
    } catch (cashError) {
      if (import.meta.env.DEV) {
        console.warn("driver_cash_collection_failed", {
          message: cashError?.message,
          code: cashError?.code,
          details: cashError?.details,
          hint: cashError?.hint,
        });
      }
      setError(copy.messages.cashRecordFailed);
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function handleIssueReason(reasonKey) {
    const reason = copy.issueReasons[reasonKey] ?? reasonKey;
    setMessage(copy.messages.issueRecorded.replace("{reason}", reason));
    setError("");
  }

  if (loading) {
    return (
      <div className="falaj-driver-app">
        <section className="falaj-driver-loading" aria-live="polite">
          <span className="falaj-driver-loading-mark" aria-hidden="true" />
          <p>{copy.loading}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="falaj-driver-app">
      <header className="falaj-driver-bar">
        <a
          className="falaj-driver-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate?.("/");
          }}
          aria-label="Falaj"
        >
          <img src="/brand/Falaj_Icon.png" alt="" />
          <span>
            <strong>Falaj</strong>
            <small>{copy.brandSubtitle}</small>
          </span>
        </a>

        <div className="falaj-driver-bar-actions">
          {driver ? (
            <RealtimeNotificationCenter
              role="driver"
              companyId={driver.companyId}
              driverId={driver.id}
              currentPath="/driver"
              onNavigate={onNavigate}
              placement="driver"
            />
          ) : null}
          <LanguageToggle className="falaj-driver-language" />
          {driver ? (
            <button
              type="button"
              className="falaj-driver-icon-button"
              onClick={handleSignOut}
              aria-label={copy.signOut}
              title={copy.signOut}
            >
              <LogOut size={19} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>

      <main className="falaj-driver-main">
        {error && <div className="falaj-driver-alert error" role="alert">{error}</div>}
        {message && <div className="falaj-driver-alert success" role="status">{message}</div>}

        {driver ? (
          <>
            <section className="falaj-driver-welcome">
              <div>
                <p>{copy.welcome}</p>
                <h1>{driver.name}</h1>
              </div>
              <span className={driver.isActive ? "falaj-driver-ready" : "falaj-driver-ready inactive"}>
                <span aria-hidden="true" />
                {driver.isActive ? copy.ready : copy.inactive}
              </span>
            </section>

            {currentOrder ? (
              <DriverActiveTask
                copy={copy}
                language={language}
                locationState={locationState}
                order={currentOrder}
                isUpdating={updatingOrderId === currentOrder.rawId}
                onShareLocation={handleShareLocation}
                onUpdateStatus={handleUpdateOrderStatus}
                onCashCollected={handleCashCollected}
                onIssueReason={handleIssueReason}
              />
            ) : (
              <section className="falaj-driver-empty falaj-driver-no-active">
                <Truck size={30} aria-hidden="true" />
                <h2>{copy.noActiveTitle}</h2>
                <p>{copy.noActiveText}</p>
              </section>
            )}

            <DriverPulse
              copy={copy}
              activeCount={activeOrders.length}
              availableCount={availableOrders.length}
              completedCount={completedOrders.length}
              locationState={locationState}
            />

            <OrderWorkspace
              activeList={activeList}
              assignedOrders={assignedOrders}
              availableOrders={availableOrders}
              completedOrders={completedOrders}
              copy={copy}
              language={language}
              updatingOrderId={updatingOrderId}
              onCashCollected={handleCashCollected}
              onClaim={handleClaimOrder}
              onListChange={setActiveList}
              onUpdateStatus={handleUpdateOrderStatus}
            />
          </>
        ) : (
          <section className="falaj-driver-empty falaj-driver-session-empty">
            <UserRound size={32} aria-hidden="true" />
            <h1>{copy.noSessionTitle}</h1>
            <p>{copy.noSessionText}</p>
            <button type="button" onClick={() => onNavigate?.("/driver/login")}>
              {copy.openLogin}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function normalizePositionCoords(position) {
  const coords = position?.coords;
  const latitude = Number(coords?.latitude);
  const longitude = Number(coords?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(Number(coords?.accuracy)) ? Number(coords.accuracy) : null,
    heading: Number.isFinite(Number(coords?.heading)) ? Number(coords.heading) : null,
    speed: Number.isFinite(Number(coords?.speed)) ? Number(coords.speed) : null,
  };
}

function shouldSaveLocation(coords, lastSaved) {
  if (!lastSaved) return true;
  if (Date.now() - lastSaved.savedAt >= LOCATION_SAVE_MIN_INTERVAL_MS) return true;
  return distanceMeters(coords, lastSaved) >= LOCATION_SAVE_MIN_MOVEMENT_METERS;
}

function distanceMeters(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const lat1 = toRadians(Number(a.latitude));
  const lat2 = toRadians(Number(b.latitude));
  const dLat = toRadians(Number(b.latitude) - Number(a.latitude));
  const dLng = toRadians(Number(b.longitude) - Number(a.longitude));
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
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

function DriverPulse({ copy, activeCount, availableCount, completedCount, locationState }) {
  const isTracking = locationState.status === "watching" || locationState.status === "shared";
  const items = [
    { icon: ClipboardList, label: copy.assigned, value: activeCount },
    { icon: PackagePlus, label: copy.available, value: availableCount },
    { icon: PackageCheck, label: copy.completed, value: completedCount },
    {
      icon: Radio,
      label: copy.tracking,
      value: isTracking ? copy.locationActive : copy.locationInactive,
      tone: isTracking ? "live" : "muted",
    },
  ];

  return (
    <section className="falaj-driver-pulse" aria-label={copy.orders}>
      {items.map(({ icon: Icon, label, value, tone }) => (
        <article className={tone ? `falaj-driver-pulse-item ${tone}` : "falaj-driver-pulse-item"} key={label}>
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function DriverActiveTask({
  copy,
  language,
  locationState,
  order,
  isUpdating,
  onShareLocation,
  onUpdateStatus,
  onCashCollected,
  onIssueReason,
}) {
  const phoneLink = phoneHref(order.phone);
  const whatsappLink = whatsappHref(order.phone);
  const mapLink = mapsHref(order);
  const nextStatus = DRIVER_NEXT_STATUS[order.status] ?? null;
  const canCollectCash =
    order.paymentMethod === "cash" &&
    order.status === "delivered" &&
    !order.cashCollectedByDriver;
  const isTracking = locationState.status === "watching" || locationState.status === "shared";
  const canShareLocation = DRIVER_TRACKING_STATUSES.includes(order.status);

  return (
    <section className="falaj-driver-task">
      <header className="falaj-driver-task-head">
        <div>
          <p>{copy.currentTask}</p>
          <h2>{order.publicCode || shortDriverId(order.rawId, copy)}</h2>
        </div>
        <span className={`falaj-driver-status ${order.status}`}>
          {localizedStatusLabel(order.status, copy)}
        </span>
      </header>

      <DriverProgress copy={copy} status={order.status} />

      <DriverPrimaryTaskAction
        copy={copy}
        isUpdating={isUpdating}
        nextStatus={nextStatus}
        order={order}
        canCollectCash={canCollectCash}
        onCashCollected={onCashCollected}
        onUpdateStatus={onUpdateStatus}
      />

      <div className="falaj-driver-task-grid">
        <article className="falaj-driver-info-block">
          <div className="falaj-driver-info-icon" aria-hidden="true">
            <UserRound size={20} />
          </div>
          <div className="falaj-driver-info-copy">
            <span>{copy.customer}</span>
            <strong>{order.customer || copy.unspecifiedCustomer}</strong>
            <small className="falaj-driver-phone">{order.phone || copy.noPhone}</small>
          </div>
          <div className="falaj-driver-quick-actions">
            {phoneLink ? (
              <DriverQuickLink href={phoneLink} label={copy.call} icon={Phone} />
            ) : null}
            {whatsappLink ? (
              <DriverQuickLink
                href={whatsappLink}
                label={copy.whatsapp}
                icon={MessageCircle}
                newTab
              />
            ) : null}
          </div>
        </article>

        <article className="falaj-driver-info-block address">
          <div className="falaj-driver-info-icon" aria-hidden="true">
            <MapPin size={20} />
          </div>
          <div className="falaj-driver-info-copy">
            <span>{copy.address}</span>
            <strong>{order.area || copy.unspecifiedArea}</strong>
            <small>{order.address || copy.incompleteAddress}</small>
          </div>
          {mapLink ? (
            <DriverQuickLink href={mapLink} label={copy.openMap} icon={Navigation} newTab />
          ) : (
            <span className="falaj-driver-text-only">{copy.textAddressOnly}</span>
          )}
        </article>
      </div>

      <div className={isTracking ? "falaj-driver-location live" : "falaj-driver-location"}>
        <Radio size={18} aria-hidden="true" />
        <div>
          <strong>{isTracking ? copy.locationActive : copy.locationInactive}</strong>
          <span>
            {isTracking && locationState.recordedAt
              ? `${copy.lastUpdate}: ${formatDriverDate(locationState.recordedAt, language)}`
              : copy.locationStartsAfterDelivery}
          </span>
        </div>
        {canShareLocation && !isTracking ? (
          <button
            type="button"
            className="falaj-driver-location-action"
            disabled={locationState.status === "requesting"}
            onClick={onShareLocation}
          >
            <Navigation size={17} aria-hidden="true" />
            {locationState.status === "requesting" ? copy.locationStarting : copy.shareLocation}
          </button>
        ) : null}
      </div>

      {locationState.warning ? (
        <div className="falaj-driver-inline-warning" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{locationState.warning}</span>
        </div>
      ) : null}

      <div className="falaj-driver-order-summary">
        <div className="falaj-driver-order-lines">
          <div className="falaj-driver-section-label">
            <ClipboardList size={18} aria-hidden="true" />
            <span>{copy.orderDetails}</span>
          </div>
          <DriverOrderItems copy={copy} items={order.items} language={language} />
        </div>
        <DriverPaymentSummary copy={copy} language={language} order={order} />
      </div>

      <details className="falaj-driver-issue-menu">
        <summary>
          <span>
            <AlertTriangle size={18} aria-hidden="true" />
            {copy.reportIssue}
          </span>
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        <p>{copy.issueHelp}</p>
        <div>
          {ISSUE_REASON_KEYS.map((reasonKey) => (
            <button type="button" key={reasonKey} onClick={() => onIssueReason(reasonKey)}>
              {copy.issueReasons[reasonKey]}
            </button>
          ))}
        </div>
      </details>

    </section>
  );
}

function DriverPrimaryTaskAction({
  copy,
  isUpdating,
  nextStatus,
  order,
  canCollectCash,
  onCashCollected,
  onUpdateStatus,
}) {
  if (!nextStatus && !canCollectCash) return null;

  return (
    <footer className="falaj-driver-task-action">
      {nextStatus ? (
        <button
          type="button"
          className="falaj-driver-primary-action"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(order, nextStatus)}
        >
          {nextStatus === "delivered" ? <CheckCircle2 size={21} aria-hidden="true" /> : <Route size={21} aria-hidden="true" />}
          {isUpdating ? copy.updating : copy.nextActions[nextStatus]}
        </button>
      ) : null}
      {canCollectCash ? (
        <button
          type="button"
          className="falaj-driver-primary-action cash"
          disabled={isUpdating}
          onClick={() => onCashCollected(order)}
        >
          <WalletCards size={21} aria-hidden="true" />
          {isUpdating ? copy.updating : copy.collectCash}
        </button>
      ) : null}
    </footer>
  );
}

function DriverProgress({ copy, status }) {
  const steps = ["assigned", "en_route", "arrived", "delivered"];
  const currentIndex = Math.max(0, steps.indexOf(status));

  return (
    <ol className="falaj-driver-progress" aria-label={copy.orderDetails}>
      {steps.map((step, index) => {
        const isDone = index < currentIndex || status === "delivered";
        const isCurrent = index === currentIndex && status !== "delivered";
        return (
          <li
            className={isDone ? "done" : isCurrent ? "current" : ""}
            key={step}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span>{isDone ? <Check size={13} aria-hidden="true" /> : index + 1}</span>
            <small>{copy.statuses[step]}</small>
          </li>
        );
      })}
    </ol>
  );
}

function DriverQuickLink({ href, icon: Icon, label, newTab = false }) {
  return (
    <a
      className="falaj-driver-quick-link"
      href={href}
      aria-label={label}
      title={label}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
    >
      <Icon size={19} aria-hidden="true" />
    </a>
  );
}

function DriverOrderItems({ copy, items = [], language }) {
  if (!items.length) {
    return <p className="falaj-driver-empty-note">{copy.noItems}</p>;
  }

  return (
    <div className="falaj-driver-items">
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.name}</span>
          <strong>
            {item.quantity} × {formatDriverMoney(item.unitPrice, language)}
          </strong>
        </div>
      ))}
    </div>
  );
}

function DriverPaymentSummary({ copy, language, order }) {
  const isCash = order.paymentMethod === "cash";
  return (
    <div className={isCash ? "falaj-driver-payment cash" : "falaj-driver-payment"}>
      <div>
        <WalletCards size={18} aria-hidden="true" />
        <span>{isCash ? copy.cashDue : copy.payment}</span>
      </div>
      <strong>{formatDriverMoney(order.amount, language)}</strong>
      <small>{isCash ? copy.cashOnDelivery : localizedPaymentLabel(order, copy)}</small>
      {isCash ? (
        <span className={order.cashCollectedByDriver ? "collected" : "pending"}>
          {order.cashCollectedByDriver ? copy.cashCollected : copy.cashNotCollected}
        </span>
      ) : null}
    </div>
  );
}

function OrderWorkspace({
  activeList,
  assignedOrders,
  availableOrders,
  completedOrders,
  copy,
  language,
  updatingOrderId,
  onCashCollected,
  onClaim,
  onListChange,
  onUpdateStatus,
}) {
  const tabs = [
    { id: "available", icon: PackagePlus, label: copy.available, count: availableOrders.length },
    { id: "assigned", icon: ClipboardList, label: copy.assigned, count: assignedOrders.length },
    { id: "completed", icon: PackageCheck, label: copy.completed, count: completedOrders.length },
  ];
  const list =
    activeList === "assigned"
      ? assignedOrders
      : activeList === "completed"
        ? completedOrders
        : availableOrders;
  const emptyText =
    activeList === "assigned"
      ? copy.noAssigned
      : activeList === "completed"
        ? copy.noCompleted
        : copy.noAvailable;

  return (
    <section className="falaj-driver-workspace">
      <div className="falaj-driver-tabs" role="tablist" aria-label={copy.orders}>
        {tabs.map(({ id, icon: Icon, label, count }) => (
          <button
            type="button"
            className={activeList === id ? "active" : ""}
            role="tab"
            aria-selected={activeList === id}
            key={id}
            onClick={() => onListChange(id)}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
            <strong>{count}</strong>
          </button>
        ))}
      </div>

      <div className="falaj-driver-tab-panel" role="tabpanel">
        {list.length ? (
          list.map((order) => (
            <DriverQueueCard
              copy={copy}
              isUpdating={updatingOrderId === order.rawId}
              key={order.rawId}
              language={language}
              order={order}
              variant={activeList}
              onCashCollected={onCashCollected}
              onClaim={onClaim}
              onUpdateStatus={onUpdateStatus}
            />
          ))
        ) : (
          <DriverEmptyList copy={copy} text={emptyText} />
        )}
      </div>
    </section>
  );
}

function DriverQueueCard({
  copy,
  isUpdating,
  language,
  order,
  variant,
  onCashCollected,
  onClaim,
  onUpdateStatus,
}) {
  const nextStatus = DRIVER_NEXT_STATUS[order.status] ?? null;
  const canCollectCash =
    variant === "completed" &&
    order.paymentMethod === "cash" &&
    order.status === "delivered" &&
    !order.cashCollectedByDriver;

  return (
    <article className="falaj-driver-queue-card">
      <header>
        <div>
          <strong>{order.publicCode || shortDriverId(order.rawId, copy)}</strong>
          <span>{order.area || copy.unspecifiedArea}</span>
        </div>
        <span className={`falaj-driver-status ${order.status}`}>
          {localizedStatusLabel(order.status, copy)}
        </span>
      </header>

      <div className="falaj-driver-queue-meta">
        <span><MapPin size={15} aria-hidden="true" />{order.address || copy.incompleteAddress}</span>
        <span><Clock3 size={15} aria-hidden="true" />{formatOrderTime(order, language, copy)}</span>
        <span><WalletCards size={15} aria-hidden="true" />{formatDriverMoney(order.amount, language)}</span>
      </div>

      {variant === "available" ? (
        <button type="button" disabled={isUpdating} onClick={() => onClaim?.(order)}>
          <PackagePlus size={18} aria-hidden="true" />
          {isUpdating ? copy.acceptingOrder : copy.acceptOrder}
        </button>
      ) : null}

      {variant === "assigned" && nextStatus ? (
        <button type="button" disabled={isUpdating} onClick={() => onUpdateStatus?.(order, nextStatus)}>
          <Route size={18} aria-hidden="true" />
          {isUpdating ? copy.updating : copy.nextActions[nextStatus]}
        </button>
      ) : null}

      {canCollectCash ? (
        <button type="button" disabled={isUpdating} onClick={() => onCashCollected?.(order)}>
          <WalletCards size={18} aria-hidden="true" />
          {isUpdating ? copy.updating : copy.collectCash}
        </button>
      ) : null}
    </article>
  );
}

function DriverEmptyList({ copy, text }) {
  return (
    <div className="falaj-driver-list-empty">
      <CheckCircle2 size={25} aria-hidden="true" />
      <p>{text}</p>
      <small>{copy.ready}</small>
    </div>
  );
}

function localizedStatusLabel(status, copy) {
  return copy.statuses[status] ?? status ?? copy.unspecified;
}

function shortDriverId(id, copy) {
  return id ? `#${String(id).slice(0, 8)}` : copy.noNumber;
}

function formatDriverMoney(value, language) {
  const amount = Number(value) || 0;
  const formatted = amount.toLocaleString(language === "ar" ? "ar-OM" : "en-OM", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  return language === "ar" ? `${formatted} ر.ع` : `OMR ${formatted}`;
}

function localizedPaymentLabel(order, copy) {
  if (order.paymentMethod === "cash") return copy.cashOnDelivery;
  return [order.paymentMethod, order.paymentStatus].filter(Boolean).join(" / ") || copy.unspecified;
}

function formatOrderTime(order, language, copy) {
  if (language === "ar" && order.time) return order.time;
  return formatDriverDate(order.createdAt, language, copy);
}

function formatDriverDate(value, language, copy = DRIVER_COPY[language] ?? DRIVER_COPY.ar) {
  if (!value) return copy.unspecified;
  return new Date(value).toLocaleString(language === "ar" ? "ar-OM" : "en-OM", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
