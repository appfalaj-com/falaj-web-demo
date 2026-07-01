import { useI18n } from "../i18n/I18nProvider.jsx";

const STATUS_TONES = {
  pending: "warning",
  pending_review: "warning",
  accepted: "info",
  assigned: "info",
  en_route: "info",
  arrived: "info",
  active: "success",
  approved: "success",
  delivered: "success",
  completed: "success",
  paid: "success",
  collected: "success",
  cash_collected: "success",
  unpaid: "warning",
  rejected: "danger",
  failed: "danger",
  cancelled: "danger",
  suspended: "danger",
  inactive: "muted",
};

export function translateWithFallback(t, key, fallback = "-") {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

export function orderStatusLabel(t, status) {
  return translateWithFallback(t, `status.order.${status}`, status || "-");
}

export function paymentMethodLabel(t, method) {
  return translateWithFallback(t, `status.paymentMethod.${method}`, method || "-");
}

export function paymentStatusLabel(t, status) {
  return translateWithFallback(t, `status.paymentStatus.${status}`, status || "-");
}

export function cashCollectionLabel(t, order, formatDateTime = (value) => value) {
  if (order?.paymentMethod !== "cash") return translateWithFallback(t, "status.cash.notApplicable", "-");
  if (order?.cashCollectedByDriver) {
    return order.cashCollectedAt
      ? `${translateWithFallback(t, "status.cash.collected", "Collected")} · ${formatDateTime(order.cashCollectedAt)}`
      : translateWithFallback(t, "status.cash.collected", "Collected");
  }
  return translateWithFallback(t, "status.cash.uncollected", "Not collected");
}

export default function StatusBadge({ type = "order", value, className = "" }) {
  const { t } = useI18n();
  const label =
    type === "paymentMethod"
      ? paymentMethodLabel(t, value)
      : type === "paymentStatus"
        ? paymentStatusLabel(t, value)
        : orderStatusLabel(t, value);
  const tone = STATUS_TONES[value] || (type === "paymentMethod" && value === "cash" ? "cash" : "muted");

  return (
    <span className={["status-badge falaj-badge", tone, value, className].filter(Boolean).join(" ")}>
      {label}
    </span>
  );
}
