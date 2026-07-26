import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  CheckCheck,
  ClipboardList,
  PackageSearch,
  X,
} from "lucide-react";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";
import {
  buildRealtimeNotification,
  consumeLocalRealtimeMutation,
  dispatchRealtimeRefresh,
} from "../services/realtimeEvents.js";

const UI_COPY = {
  ar: {
    notifications: "الإشعارات",
    noNotifications: "لا توجد إشعارات جديدة",
    noNotificationsNote: "ستظهر هنا الطلبات والتحديثات التي تحتاج إلى انتباهك.",
    markAllRead: "تحديد الكل كمقروء",
    close: "إغلاق",
    connected: "التحديث اللحظي متصل",
    connecting: "جاري الاتصال بالتحديث اللحظي",
  },
  en: {
    notifications: "Notifications",
    noNotifications: "No new notifications",
    noNotificationsNote: "Orders and updates that need your attention will appear here.",
    markAllRead: "Mark all as read",
    close: "Close",
    connected: "Live updates connected",
    connecting: "Connecting to live updates",
  },
};

export default function RealtimeNotificationCenter({
  role,
  companyId,
  driverId,
  currentPath,
  onNavigate,
  placement = "sidebar",
}) {
  const { language } = useI18n();
  const copy = UI_COPY[language] ?? UI_COPY.ar;
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const seenEventsRef = useRef(new Set());
  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (!supabase || !role) return undefined;
    if (role === "company" && !companyId) return undefined;
    if (role === "driver" && (!companyId || !driverId)) return undefined;

    const channelSuffix =
      role === "admin" ? "all" : companyId || driverId || "unknown";
    let channel = supabase.channel(
      `falaj-notifications-${role}-${channelSuffix}`
    );

    function handleChange(table, payload) {
      const newRecord = payload.new ?? {};
      const oldRecord = payload.old ?? {};
      const recordId = newRecord.id || oldRecord.id;
      const detail = {
        table,
        eventType: payload.eventType,
        recordId,
        newRecord,
        oldRecord,
        receivedAt: new Date().toISOString(),
      };

      dispatchRealtimeRefresh(detail);

      if (consumeLocalRealtimeMutation(table, recordId)) return;

      const nextNotification = buildRealtimeNotification({
        role,
        table,
        eventType: payload.eventType,
        newRecord,
        oldRecord,
        driverId,
        language,
      });

      if (!nextNotification) return;

      const eventKey = [
        nextNotification.fingerprint,
        payload.commit_timestamp || newRecord.updated_at || newRecord.created_at,
      ]
        .filter(Boolean)
        .join(":");

      if (seenEventsRef.current.has(eventKey)) return;
      seenEventsRef.current.add(eventKey);
      if (seenEventsRef.current.size > 100) {
        seenEventsRef.current = new Set(
          [...seenEventsRef.current].slice(-60)
        );
      }

      const notification = {
        ...nextNotification,
        id: `${eventKey || nextNotification.fingerprint}:${Date.now()}`,
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((current) => [notification, ...current].slice(0, 20));
      setToast(notification);
    }

    if (role === "company") {
      channel = channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `company_id=eq.${companyId}`,
          },
          (payload) => handleChange("orders", payload)
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "products",
            filter: `company_id=eq.${companyId}`,
          },
          (payload) => handleChange("products", payload)
        );
    }

    if (role === "admin") {
      channel = channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          (payload) => handleChange("orders", payload)
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "supplier_join_requests" },
          (payload) => handleChange("supplier_join_requests", payload)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          (payload) => handleChange("products", payload)
        );
    }

    if (role === "driver") {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => handleChange("orders", payload)
      );
    }

    channel.subscribe((status) => {
      setIsConnected(status === "SUBSCRIBED");
    });

    return () => {
      setIsConnected(false);
      supabase.removeChannel(channel);
    };
  }, [companyId, driverId, language, role]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openNotification(notification) {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item
      )
    );
    setToast(null);
    setIsOpen(false);

    if (notification.actionPath && notification.actionPath !== currentPath) {
      onNavigate?.(notification.actionPath);
    }
  }

  function markAllRead() {
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true }))
    );
  }

  return (
    <div className={`falaj-notification-center ${placement}`}>
      <button
        type="button"
        className="falaj-notification-bell"
        aria-label={copy.notifications}
        aria-expanded={isOpen}
        title={copy.notifications}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 ? (
          <strong aria-label={`${unreadCount} ${copy.notifications}`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </strong>
        ) : null}
      </button>

      {isOpen ? (
        <section className="falaj-notification-panel" aria-label={copy.notifications}>
          <header>
            <div>
              <Bell size={18} aria-hidden="true" />
              <h2>{copy.notifications}</h2>
            </div>
            <div>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  aria-label={copy.markAllRead}
                  title={copy.markAllRead}
                >
                  <CheckCheck size={18} aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={copy.close}
                title={copy.close}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="falaj-notification-list">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <article
                  className={notification.read ? "read" : "unread"}
                  key={notification.id}
                >
                  <button
                    type="button"
                    onClick={() => openNotification(notification)}
                  >
                    <span className={`falaj-notification-kind ${notification.kind}`}>
                      <NotificationIcon kind={notification.kind} />
                    </span>
                    <span>
                      <strong>{notification.title}</strong>
                      <small>{notification.message}</small>
                      <time>{formatNotificationTime(notification.createdAt, language)}</time>
                    </span>
                  </button>
                </article>
              ))
            ) : (
              <div className="falaj-notification-empty">
                <CheckCheck size={26} aria-hidden="true" />
                <strong>{copy.noNotifications}</strong>
                <span>{copy.noNotificationsNote}</span>
              </div>
            )}
          </div>

          <footer className={isConnected ? "connected" : ""}>
            <span aria-hidden="true" />
            {isConnected ? copy.connected : copy.connecting}
          </footer>
        </section>
      ) : null}

      {toast ? (
        <aside className={`falaj-notification-toast ${toast.kind}`} role="status">
          <span className={`falaj-notification-kind ${toast.kind}`}>
            <NotificationIcon kind={toast.kind} />
          </span>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
            <button type="button" onClick={() => openNotification(toast)}>
              {toast.actionLabel}
            </button>
          </div>
          <button
            type="button"
            className="falaj-notification-toast-close"
            onClick={() => setToast(null)}
            aria-label={copy.close}
            title={copy.close}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </aside>
      ) : null}
    </div>
  );
}

function NotificationIcon({ kind }) {
  if (kind === "supplier") return <Building2 size={18} aria-hidden="true" />;
  if (kind === "product") return <PackageSearch size={18} aria-hidden="true" />;
  return <ClipboardList size={18} aria-hidden="true" />;
}

function formatNotificationTime(value, language) {
  return new Date(value).toLocaleTimeString(
    language === "ar" ? "ar-OM" : "en-OM",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}
