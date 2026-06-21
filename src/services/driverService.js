import { mockDrivers } from "../data/mockData.js";
import { supabase } from "../lib/supabaseClient.js";
import { getOrdersByDriver } from "./orderService.js";

export const MOCK_DRIVER_ID = "driver-1";

const SUPABASE_COMPANY_ID_BY_MOCK_ID = {
  "company-1": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

const ACTIVE_DRIVER_STATUSES = ["assigned", "en_route", "arrived"];
const DONE_DRIVER_STATUSES = ["delivered", "failed"];

export function getDrivers(drivers = mockDrivers) {
  return drivers;
}

export function getDriversByCompany(companyId, drivers = mockDrivers) {
  if (!companyId) return getDrivers(drivers);
  return getDrivers(drivers).filter((driver) => driver.companyId === companyId || !driver.companyId);
}

function normalizeSupabaseDriver(driver) {
  return {
    id: driver.id,
    companyId: driver.company_id,
    name: driver.name,
    phone: driver.phone,
    vehicle: driver.vehicle_label || driver.vehicle_plate || "غير محدد",
    status: driver.is_online ? "متاح" : "غير متصل",
    cashToday: 0,
  };
}

export async function getDriversByCompanyFromSupabase(companyId) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const supabaseCompanyId = SUPABASE_COMPANY_ID_BY_MOCK_ID[companyId] ?? companyId;
  const { data, error } = await supabase
    .from("drivers")
    .select("id, company_id, name, phone, vehicle_plate, vehicle_label, is_active, is_online")
    .eq("company_id", supabaseCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeSupabaseDriver);
}

export function getDriverById(driverId, drivers = mockDrivers) {
  return drivers.find((driver) => driver.id === driverId) ?? null;
}

export function getDriverWorkflow(driverId, orders, drivers = mockDrivers) {
  const driver = getDriverById(driverId, drivers);
  const driverOrders = getOrdersByDriver(driverId, orders);
  const activeOrders = driverOrders.filter((order) => ACTIVE_DRIVER_STATUSES.includes(order.status));

  return {
    driver,
    currentOrder: activeOrders[0] ?? null,
    nextOrders: activeOrders.slice(1),
    completedOrders: driverOrders.filter((order) => DONE_DRIVER_STATUSES.includes(order.status)),
  };
}
