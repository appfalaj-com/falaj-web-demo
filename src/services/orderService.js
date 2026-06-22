import { mockOrders } from "../data/mockData.js";
import { supabase } from "../lib/supabaseClient.js";

const SUPABASE_COMPANY_ID_BY_MOCK_ID = {
  "company-1": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

const SUPABASE_DRIVER_ID_BY_MOCK_ID = {
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc": "driver-1",
};

function normalizeSupabaseOrder(order) {
  return {
    id: order.public_code || order.id,
    rawId: order.id,
    publicCode: order.public_code,
    companyId: order.company_id,
    customer: order.customer_name_snapshot,
    phone: order.customer_phone_snapshot,
    area: order.delivery_area,
    address: order.delivery_details,
    deliveryLat: order.delivery_lat,
    deliveryLng: order.delivery_lng,
    waterType: order.water_type,
    volumeLiters: order.volume_liters,
    volume: `${order.volume_liters} لتر`,
    status: order.status,
    payment: order.payment_method,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    cashCollectedByDriver: order.cash_collected_by_driver,
    amount: Number(order.price) || 0,
    driverId: SUPABASE_DRIVER_ID_BY_MOCK_ID[order.driver_id] ?? order.driver_id ?? null,
    time: order.created_at
      ? new Date(order.created_at).toLocaleTimeString("ar-OM", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    notes: order.notes,
    scheduledAt: order.scheduled_at,
    acceptedAt: order.accepted_at,
    assignedAt: order.assigned_at,
    enRouteAt: order.en_route_at,
    arrivedAt: order.arrived_at,
    deliveredAt: order.delivered_at,
    failedAt: order.failed_at,
    cancelledAt: order.cancelled_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

function normalizeOrderStatusHistory(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    note: row.note,
    changedByProfileId: row.changed_by_profile_id,
    createdAt: row.created_at,
  };
}

export function getOrders(orders = mockOrders) {
  return orders;
}

export function getOrdersByCompany(companyId, orders = mockOrders) {
  if (!companyId) return orders;
  return orders.filter((order) => order.companyId === companyId || !order.companyId);
}

export async function getOrdersByCompanyFromSupabase(companyId) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const supabaseCompanyId = SUPABASE_COMPANY_ID_BY_MOCK_ID[companyId] ?? companyId;
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelectColumns())
    .eq("company_id", supabaseCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeSupabaseOrder);
}

export async function updateCompanyOrderStatusInSupabase(companyId, orderId, nextStatus) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const supabaseCompanyId = SUPABASE_COMPANY_ID_BY_MOCK_ID[companyId] ?? companyId;
  const patch = { status: nextStatus };
  const timestampField = timestampFieldByStatus(nextStatus);
  if (timestampField) patch[timestampField] = new Date().toISOString();

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .eq("company_id", supabaseCompanyId)
    .select(orderSelectColumns())
    .single();

  if (error) {
    throw error;
  }

  await addOrderStatusHistory(orderId, nextStatus);
  return normalizeSupabaseOrder(data);
}

export async function getOrderStatusHistoryFromSupabase(orderId) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const { data, error } = await supabase
    .from("order_status_history")
    .select("id, order_id, status, changed_by_profile_id, note, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeOrderStatusHistory);
}

export function getOrdersByDriver(driverId, orders = mockOrders) {
  return orders.filter((order) => order.driverId === driverId && order.status !== "rejected");
}

export function getNewOrders(orders = mockOrders) {
  return orders.filter((order) => order.status === "pending");
}

export function getActiveOrders(orders = mockOrders) {
  return orders.filter((order) =>
    ["active", "accepted", "assigned", "en_route", "arrived"].includes(order.status)
  );
}

export function getCompletedOrders(orders = mockOrders) {
  return orders.filter((order) => ["completed", "delivered"].includes(order.status));
}

async function addOrderStatusHistory(orderId, status) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("order_status_history").insert({
    order_id: orderId,
    status,
    changed_by_profile_id: userData?.user?.id ?? null,
    note: "تحديث من لوحة المورد",
  });

  if (error) {
    throw error;
  }
}

function timestampFieldByStatus(status) {
  const fields = {
    accepted: "accepted_at",
    assigned: "assigned_at",
    en_route: "en_route_at",
    arrived: "arrived_at",
    delivered: "delivered_at",
    failed: "failed_at",
    cancelled: "cancelled_at",
  };

  return fields[status] ?? null;
}

function orderSelectColumns() {
  return [
    "id",
    "public_code",
    "customer_name_snapshot",
    "customer_phone_snapshot",
    "company_id",
    "driver_id",
    "water_type",
    "volume_liters",
    "delivery_area",
    "delivery_details",
    "delivery_lat",
    "delivery_lng",
    "status",
    "payment_method",
    "payment_status",
    "cash_collected_by_driver",
    "price",
    "notes",
    "scheduled_at",
    "accepted_at",
    "assigned_at",
    "en_route_at",
    "arrived_at",
    "delivered_at",
    "failed_at",
    "cancelled_at",
    "created_at",
    "updated_at",
  ].join(",");
}
