export const FALAJ_REALTIME_REFRESH_EVENT = "falaj:realtime-refresh";

const LOCAL_MUTATION_TTL_MS = 15000;
const localMutations = new Map();

const NOTIFICATION_COPY = {
  ar: {
    open: "فتح",
    newCompanyOrder: "طلب جديد للمورد",
    newAdminOrder: "طلب جديد في فلج",
    newDriverOrder: "طلب متاح جديد",
    assignedDriverOrder: "تم إسناد طلب إليك",
    orderUpdated: "تحديث على الطلب",
    orderMessage: (code) => `الطلب ${code} يحتاج إلى مراجعتك.`,
    statusMessage: (code, status) => `الطلب ${code} أصبح: ${status}.`,
    productReview: "منتج جديد بانتظار المراجعة",
    productReviewMessage: (name) => `${name || "منتج جديد"} يحتاج إلى قرار من الإدارة.`,
    productUpdated: "تم تحديث مراجعة المنتج",
    productUpdatedMessage: (name, status) => `${name || "المنتج"} أصبح: ${status}.`,
    supplierRequest: "طلب انضمام مورد جديد",
    supplierRequestMessage: (name) => `${name || "مورد جديد"} أرسل طلب انضمام.`,
    unspecifiedOrder: "طلب جديد",
    statuses: {
      pending: "جديد",
      accepted: "مقبول",
      assigned: "مسند",
      en_route: "في الطريق",
      arrived: "وصل للعميل",
      delivered: "تم التسليم",
      failed: "تعذر التوصيل",
      cancelled: "ملغي",
      rejected: "مرفوض",
      paid: "مدفوع",
      unpaid: "غير مدفوع",
      pending_review: "قيد المراجعة",
      approved: "معتمد",
      hidden: "مخفي",
    },
  },
  en: {
    open: "Open",
    newCompanyOrder: "New supplier order",
    newAdminOrder: "New Falaj order",
    newDriverOrder: "New available order",
    assignedDriverOrder: "An order was assigned to you",
    orderUpdated: "Order updated",
    orderMessage: (code) => `Order ${code} needs your attention.`,
    statusMessage: (code, status) => `Order ${code} is now: ${status}.`,
    productReview: "Product awaiting review",
    productReviewMessage: (name) => `${name || "A new product"} needs an admin decision.`,
    productUpdated: "Product review updated",
    productUpdatedMessage: (name, status) => `${name || "Product"} is now: ${status}.`,
    supplierRequest: "New supplier join request",
    supplierRequestMessage: (name) => `${name || "A new supplier"} submitted a join request.`,
    unspecifiedOrder: "New order",
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
      paid: "Paid",
      unpaid: "Unpaid",
      pending_review: "Pending review",
      approved: "Approved",
      hidden: "Hidden",
    },
  },
};

export function markLocalRealtimeMutation(table, recordId) {
  if (!table || !recordId) return;
  pruneLocalMutations();
  localMutations.set(mutationKey(table, recordId), Date.now());
}

export function consumeLocalRealtimeMutation(table, recordId) {
  if (!table || !recordId) return false;
  pruneLocalMutations();
  const key = mutationKey(table, recordId);
  const markedAt = localMutations.get(key);
  if (!markedAt) return false;
  localMutations.delete(key);
  return Date.now() - markedAt <= LOCAL_MUTATION_TTL_MS;
}

export function dispatchRealtimeRefresh(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FALAJ_REALTIME_REFRESH_EVENT, {
      detail,
    })
  );
}

export function buildRealtimeNotification({
  role,
  table,
  eventType,
  newRecord = {},
  oldRecord = {},
  driverId,
  language = "ar",
}) {
  const copy = NOTIFICATION_COPY[language] ?? NOTIFICATION_COPY.ar;
  const normalizedEvent = String(eventType || "").toUpperCase();

  if (table === "orders") {
    return buildOrderNotification({
      role,
      normalizedEvent,
      newRecord,
      oldRecord,
      driverId,
      copy,
    });
  }

  if (table === "products") {
    return buildProductNotification({
      role,
      normalizedEvent,
      newRecord,
      oldRecord,
      copy,
    });
  }

  if (
    role === "admin" &&
    table === "supplier_join_requests" &&
    normalizedEvent === "INSERT"
  ) {
    const name = newRecord.company_name;
    return {
      fingerprint: `supplier_join_requests:${newRecord.id}:insert`,
      kind: "supplier",
      title: copy.supplierRequest,
      message: copy.supplierRequestMessage(name),
      actionPath: "/admin/supplier-requests",
      actionLabel: copy.open,
    };
  }

  return null;
}

function buildOrderNotification({
  role,
  normalizedEvent,
  newRecord,
  oldRecord,
  driverId,
  copy,
}) {
  const orderId = newRecord.id || oldRecord.id;
  const code =
    newRecord.public_code ||
    oldRecord.public_code ||
    (orderId ? `#${String(orderId).slice(0, 8)}` : copy.unspecifiedOrder);
  const isInsert = normalizedEvent === "INSERT";
  const isUpdate = normalizedEvent === "UPDATE";
  const statusChanged =
    isUpdate &&
    Boolean(oldRecord.status) &&
    oldRecord.status !== newRecord.status;
  const assignedToCurrentDriver =
    role === "driver" &&
    Boolean(driverId) &&
    newRecord.driver_id === driverId &&
    oldRecord.driver_id !== driverId;

  if (role === "driver") {
    if (
      isInsert &&
      !newRecord.driver_id &&
      ["pending", "accepted"].includes(newRecord.status)
    ) {
      return orderNotification(
        orderId,
        "available",
        copy.newDriverOrder,
        copy.orderMessage(code),
        "/driver",
        copy.open
      );
    }

    if (assignedToCurrentDriver) {
      return orderNotification(
        orderId,
        "assigned",
        copy.assignedDriverOrder,
        copy.orderMessage(code),
        "/driver",
        copy.open
      );
    }

    if (statusChanged && newRecord.driver_id === driverId) {
      return orderNotification(
        orderId,
        `status:${newRecord.status}`,
        copy.orderUpdated,
        copy.statusMessage(code, statusLabel(copy, newRecord.status)),
        "/driver",
        copy.open
      );
    }

    return null;
  }

  if (isInsert) {
    return orderNotification(
      orderId,
      "insert",
      role === "admin" ? copy.newAdminOrder : copy.newCompanyOrder,
      copy.orderMessage(code),
      role === "admin" ? "/admin/orders" : "/company/orders",
      copy.open
    );
  }

  if (statusChanged) {
    return orderNotification(
      orderId,
      `status:${newRecord.status}`,
      copy.orderUpdated,
      copy.statusMessage(code, statusLabel(copy, newRecord.status)),
      role === "admin" ? "/admin/orders" : "/company/orders",
      copy.open
    );
  }

  return null;
}

function buildProductNotification({
  role,
  normalizedEvent,
  newRecord,
  oldRecord,
  copy,
}) {
  const productId = newRecord.id || oldRecord.id;
  const name = newRecord.name || oldRecord.name;
  const reviewBecamePending =
    newRecord.approval_status === "pending_review" &&
    (normalizedEvent === "INSERT" ||
      oldRecord.approval_status !== "pending_review");

  if (role === "admin" && reviewBecamePending) {
    return {
      fingerprint: `products:${productId}:pending_review`,
      kind: "product",
      title: copy.productReview,
      message: copy.productReviewMessage(name),
      actionPath: "/admin/product-moderation",
      actionLabel: copy.open,
    };
  }

  if (
    role === "company" &&
    normalizedEvent === "UPDATE" &&
    Boolean(oldRecord.approval_status) &&
    oldRecord.approval_status !== newRecord.approval_status
  ) {
    return {
      fingerprint: `products:${productId}:${newRecord.approval_status}`,
      kind: "product",
      title: copy.productUpdated,
      message: copy.productUpdatedMessage(
        name,
        statusLabel(copy, newRecord.approval_status)
      ),
      actionPath: "/company/products",
      actionLabel: copy.open,
    };
  }

  return null;
}

function orderNotification(
  orderId,
  change,
  title,
  message,
  actionPath,
  actionLabel
) {
  return {
    fingerprint: `orders:${orderId}:${change}`,
    kind: "order",
    title,
    message,
    actionPath,
    actionLabel,
  };
}

function statusLabel(copy, status) {
  return copy.statuses[status] ?? status ?? copy.statuses.pending;
}

function mutationKey(table, recordId) {
  return `${table}:${recordId}`;
}

function pruneLocalMutations() {
  const cutoff = Date.now() - LOCAL_MUTATION_TTL_MS;
  localMutations.forEach((markedAt, key) => {
    if (markedAt < cutoff) localMutations.delete(key);
  });
}
