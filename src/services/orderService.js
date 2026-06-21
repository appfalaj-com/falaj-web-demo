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
    id: order.public_code,
    companyId: order.company_id,
    customer: order.customer_name_snapshot,
    phone: order.customer_phone_snapshot,
    area: order.delivery_area,
    address: order.delivery_details,
    waterType: order.water_type,
    volume: `${order.volume_liters} لتر`,
    status: order.status,
    payment: order.payment_method,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    cashCollectedByDriver: order.cash_collected_by_driver,
    amount: Number(order.price) || 0,
    driverId: SUPABASE_DRIVER_ID_BY_MOCK_ID[order.driver_id] ?? null,
    time: order.created_at ? new Date(order.created_at).toLocaleTimeString("ar-OM", {
      hour: "2-digit",
      minute: "2-digit",
    }) : "",
    notes: order.notes,
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
  const query = [
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
    "status",
    "payment_method",
    "payment_status",
    "cash_collected_by_driver",
    "price",
    "notes",
    "created_at",
  ].join(",");

  const { data, error } = await supabase
    .from("orders")
    .select(query)
    .eq("company_id", supabaseCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  if ((data ?? []).length > 0) {
    return data.map(normalizeSupabaseOrder);
  }

  const { data: demoData, error: demoError } = await supabase
    .from("orders")
    .select(query)
    .order("created_at", { ascending: false })
    .limit(50);

  if (demoError) {
    throw demoError;
  }

  return (demoData ?? []).map(normalizeSupabaseOrder);
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
