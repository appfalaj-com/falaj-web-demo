import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const ACTIVE_ORDER_STATUSES = ["accepted", "assigned", "en_route", "arrived"];

export default function AdminLiveTrackingPage() {
  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTrackingData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await fetchLiveTrackingData();
        if (!cancelled) {
          setCompanies(data.companies);
          setDrivers(data.drivers);
          setOrders(data.orders);
        }
      } catch (error) {
        if (!cancelled) {
          setCompanies([]);
          setDrivers([]);
          setOrders([]);
          setErrorMessage(error.message || "تعذر تحميل بيانات التتبع من قاعدة البيانات.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadTrackingData();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleDrivers = useMemo(
    () =>
      companyFilter === "all"
        ? drivers
        : drivers.filter((driver) => driver.company_id === companyFilter),
    [companyFilter, drivers]
  );

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesCompany = companyFilter === "all" || order.company_id === companyFilter;
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        return matchesCompany && matchesStatus;
      }),
    [companyFilter, orders, statusFilter]
  );

  const hasTrackingData = visibleDrivers.some((driver) => driver.lastLocation) || visibleOrders.length > 0;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">التتبع العام</p>
          <h1>متابعة الطلبات والسائقين</h1>
        </div>
      </header>

      {errorMessage ? <p className="auth-alert error">تعذر تحميل بيانات التتبع من قاعدة البيانات.</p> : null}

      <section className="panel overview">
        <div className="filter-row">
          <label>
            المورد
            <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
              <option value="all">كل الموردين</option>
              {companies.map((company) => (
                <option value={company.id} key={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            حالة الطلب
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">كل الحالات</option>
              {ACTIVE_ORDER_STATUSES.map((status) => (
                <option value={status} key={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {isLoading ? (
        <section className="panel">
          <p className="empty-state">جاري تحميل بيانات التتبع...</p>
        </section>
      ) : errorMessage ? (
        <section className="panel">
          <p className="empty-state">تعذر تحميل بيانات التتبع من قاعدة البيانات.</p>
        </section>
      ) : !hasTrackingData ? (
        <section className="panel">
          <div className="empty-state">
            <strong>لا يوجد تتبع مباشر حاليًا</strong>
            <span>ستظهر هنا مواقع السائقين بعد تسجيل دخولهم وبدء مشاركة الموقع.</span>
          </div>
        </section>
      ) : (
        <>
          <section className="cards-grid">
            {visibleDrivers.map((driver) => (
              <article className="driver-card" key={driver.id}>
                <h2>{driver.name}</h2>
                <p>{driver.companies?.name || "مورد غير محدد"}</p>
                <dl>
                  <div>
                    <dt>الحالة</dt>
                    <dd>{driver.is_online ? "متصل" : "غير متصل"}</dd>
                  </div>
                  <div>
                    <dt>الطلب الحالي</dt>
                    <dd>{visibleOrders.find((order) => order.driver_id === driver.id)?.public_code ?? "لا يوجد"}</dd>
                  </div>
                  <div>
                    <dt>آخر موقع معروف</dt>
                    <dd>{formatLocation(driver.lastLocation)}</dd>
                  </div>
                  <div>
                    <dt>آخر تحديث</dt>
                    <dd>{formatDateTime(driver.lastLocation?.recorded_at)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>الطلبات الجارية</h2>
                <p>الطلبات النشطة المرتبطة بالسائقين والشركات في قاعدة البيانات.</p>
              </div>
            </div>
            {visibleOrders.length === 0 ? (
              <div className="empty-state">
                <strong>لا توجد طلبات نشطة حاليًا</strong>
                <span>ستظهر هنا الطلبات بعد قبولها أو إسنادها للسائقين.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>الطلب</th>
                      <th>الزبون</th>
                      <th>المورد</th>
                      <th>المنطقة</th>
                      <th>السائق</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.public_code || order.id}</td>
                        <td>{order.customer_name_snapshot || "-"}</td>
                        <td>{order.companies?.name || "-"}</td>
                        <td>{order.delivery_area || "-"}</td>
                        <td>{order.drivers?.name || "-"}</td>
                        <td>{statusLabel(order.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

async function fetchLiveTrackingData() {
  if (!supabase) {
    throw new Error("Supabase غير مفعّل حاليًا.");
  }

  const [companiesResult, driversResult, ordersResult] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, is_active, onboarding_status")
      .order("name", { ascending: true }),
    supabase
      .from("drivers")
      .select("id, company_id, name, phone, vehicle_plate, vehicle_label, is_online, companies(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, public_code, company_id, driver_id, customer_name_snapshot, delivery_area, status, companies(name), drivers(name)")
      .in("status", ACTIVE_ORDER_STATUSES)
      .order("created_at", { ascending: false }),
  ]);

  if (companiesResult.error) throw companiesResult.error;
  if (driversResult.error) throw driversResult.error;
  if (ordersResult.error) throw ordersResult.error;

  const drivers = driversResult.data ?? [];
  const driverIds = drivers.map((driver) => driver.id);
  const companyIds = [...new Set(drivers.map((driver) => driver.company_id).filter(Boolean))];
  const locations =
    driverIds.length > 0
      ? await fetchLatestDriverLocations(driverIds, companyIds)
      : [];

  const locationsByDriverId = new Map();
  locations.forEach((location) => {
    if (!locationsByDriverId.has(location.driver_id)) {
      locationsByDriverId.set(location.driver_id, location);
    }
  });

  return {
    companies: companiesResult.data ?? [],
    orders: ordersResult.data ?? [],
    drivers: drivers.map((driver) => ({
      ...driver,
      lastLocation: locationsByDriverId.get(driver.id) ?? null,
    })),
  };
}

async function fetchLatestDriverLocations(driverIds, companyIds) {
  let query = supabase
    .from("driver_locations")
    .select("id, driver_id, company_id, latitude, longitude, accuracy, recorded_at, source")
    .in("driver_id", driverIds)
    .order("recorded_at", { ascending: false });

  if (companyIds.length > 0) {
    query = query.in("company_id", companyIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

function formatLocation(location) {
  if (!location) return "لا يوجد تتبع نشط حاليًا";
  return `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ar-OM");
}

function statusLabel(status) {
  const labels = {
    accepted: "مقبول",
    assigned: "مسند",
    en_route: "في الطريق",
    arrived: "وصل",
  };

  return labels[status] ?? status;
}
