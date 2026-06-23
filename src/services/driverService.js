import { supabase } from "../lib/supabaseClient.js";
import { getOrdersByDriver } from "./orderService.js";

const ACTIVE_DRIVER_STATUSES = ["assigned", "en_route", "arrived"];
const DONE_DRIVER_STATUSES = ["delivered", "failed"];

export function getDrivers(drivers = []) {
  return drivers;
}

export function getDriversByCompany(companyId, drivers = []) {
  if (!companyId) return getDrivers(drivers);
  return getDrivers(drivers).filter((driver) => driver.companyId === companyId || !driver.companyId);
}

function normalizeSupabaseDriver(driver) {
  return {
    id: driver.id,
    companyId: driver.company_id,
    companyName: driver.companies?.name ?? driver.company_name ?? null,
    profileId: driver.profile_id,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    vehiclePlate: driver.vehicle_plate,
    vehicleLabel: driver.vehicle_label,
    vehicle: driver.vehicle_label || driver.vehicle_plate || "غير محدد",
    isActive: driver.is_active,
    isOnline: driver.is_online,
    status: driver.is_online ? "متاح" : "غير متصل",
    createdAt: driver.created_at,
    updatedAt: driver.updated_at,
    cashToday: 0,
  };
}

export async function getCurrentDriverFromSupabase() {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }

  const user = userData?.user;
  if (!user) {
    return { user: null, driver: null };
  }

  const { data, error } = await supabase
    .from("drivers")
    .select(`${driverSelectColumns()}, companies(name)`)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    user,
    driver: data ? normalizeSupabaseDriver(data) : null,
  };
}

export async function getDriversByCompanyFromSupabase(companyId) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const { data, error } = await supabase
    .from("drivers")
    .select(driverSelectColumns())
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeSupabaseDriver);
}

export async function createCompanyDriverInSupabase(companyId, driver) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const { data, error } = await supabase
    .from("drivers")
    .insert({
      company_id: companyId,
      name: driver.name,
      phone: driver.phone || null,
      email: driver.email || null,
      is_active: true,
      profile_id: null,
    })
    .select(driverSelectColumns())
    .single();

  if (error) {
    throw error;
  }

  return normalizeSupabaseDriver(data);
}

export async function updateCompanyDriverInSupabase(companyId, driverId, driver) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const { data, error } = await supabase
    .from("drivers")
    .update({
      name: driver.name,
      phone: driver.phone || null,
      email: driver.email || null,
      is_active: Boolean(driver.isActive),
    })
    .eq("id", driverId)
    .eq("company_id", companyId)
    .select(driverSelectColumns())
    .single();

  if (error) {
    throw error;
  }

  return normalizeSupabaseDriver(data);
}

export async function getDriversLiveLocationsByCompanyFromSupabase(companyId) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const { data: drivers, error: driversError } = await supabase
    .from("drivers")
    .select(driverSelectColumns())
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (driversError) {
    throw driversError;
  }

  const normalizedDrivers = (drivers ?? []).map(normalizeSupabaseDriver);
  if (normalizedDrivers.length === 0) return [];

  const driverIds = normalizedDrivers.map((driver) => driver.id);
  const { data: locations, error: locationsError } = await supabase
    .from("driver_locations")
    .select("id, driver_id, company_id, latitude, longitude, accuracy, recorded_at, source")
    .eq("company_id", companyId)
    .in("driver_id", driverIds)
    .order("recorded_at", { ascending: false });

  if (locationsError) {
    throw locationsError;
  }

  const locationsByDriverId = new Map();
  (locations ?? []).forEach((location) => {
    if (!locationsByDriverId.has(location.driver_id)) {
      locationsByDriverId.set(location.driver_id, location);
    }
  });

  return normalizedDrivers.map((driver) => ({
    ...driver,
    lastLocation: locationsByDriverId.get(driver.id) ?? null,
  }));
}

export async function saveDriverLocationInSupabase(driver, position) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  if (!driver?.id || !driver?.companyId || !driver?.isActive) {
    throw new Error("لا يمكن حفظ الموقع إلا لسائق مربوط ونشط.");
  }

  const { data, error } = await supabase
    .from("driver_locations")
    .insert({
      driver_id: driver.id,
      company_id: driver.companyId,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy ?? null,
      source: "web",
    })
    .select("id, driver_id, company_id, latitude, longitude, accuracy, recorded_at, source")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function sendDriverInviteFromSupabase(driverId) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  if (!driverId) {
    throw new Error("تعذر تحديد السائق لإرسال الدعوة.");
  }

  const { data, error } = await supabase.functions.invoke("send-driver-invite", {
    body: { driver_id: driverId },
  });

  if (error) {
    throw new Error(data?.error || data?.message || error.message || "تعذر إرسال دعوة دخول السائق.");
  }

  if (!data?.ok) {
    throw new Error(data?.error || data?.message || "تعذر إرسال دعوة دخول السائق.");
  }

  return data;
}

export function getDriverById(driverId, drivers = []) {
  return drivers.find((driver) => driver.id === driverId) ?? null;
}

export function getDriverWorkflow(driverId, orders, drivers = []) {
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

function driverSelectColumns() {
  return [
    "id",
    "company_id",
    "profile_id",
    "name",
    "phone",
    "email",
    "vehicle_plate",
    "vehicle_label",
    "is_active",
    "is_online",
    "created_at",
    "updated_at",
  ].join(",");
}
