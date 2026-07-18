import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { orderStatusLabel } from "../components/StatusBadge.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";

const ACTIVE_ORDER_STATUSES = ["accepted", "assigned", "en_route", "arrived"];
const LOCATION_STALE_MS = 2 * 60 * 1000;

export default function AdminLiveTrackingPage() {
  const { language, t } = useI18n();
  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    let pollingTimer = null;
    let channel = null;

    async function loadTrackingData(options = {}) {
      if (!options.silent) setIsLoading(true);
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
          setErrorMessage(error.message || t("page.admin.tracking.loadError"));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadTrackingData();
    pollingTimer = window.setInterval(() => loadTrackingData({ silent: true }), 30000);

    if (supabase) {
      channel = supabase
        .channel("admin-driver-locations")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "driver_locations",
          },
          () => loadTrackingData({ silent: true })
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      if (pollingTimer) window.clearInterval(pollingTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [t]);

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

  const trackedDrivers = visibleDrivers.filter((driver) => driver.activeOrder && driver.lastLocation);
  const hasTrackingData = trackedDrivers.length > 0 || visibleOrders.length > 0;

  return (
    <div className="page">
      <PageHeader eyebrowKey="page.admin.tracking.eyebrow" titleKey="page.admin.tracking.title" />

      {errorMessage ? <p className="auth-alert error">{t("page.admin.tracking.loadError")}</p> : null}

      <section className="panel overview">
        <div className="filter-row">
          <label>
            {t("page.admin.tracking.supplier")}
            <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
              <option value="all">{t("page.admin.tracking.allSuppliers")}</option>
              {companies.map((company) => (
                <option value={company.id} key={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("page.admin.tracking.orderStatus")}
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">{t("page.admin.tracking.allStatuses")}</option>
              {ACTIVE_ORDER_STATUSES.map((status) => (
                <option value={status} key={status}>
                  {orderStatusLabel(t, status)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {isLoading ? (
        <section className="panel">
          <p className="empty-state">{t("page.admin.tracking.loading")}</p>
        </section>
      ) : errorMessage ? (
        <section className="panel">
          <p className="empty-state">{t("page.admin.tracking.loadError")}</p>
        </section>
      ) : !hasTrackingData ? (
        <section className="panel">
          <div className="empty-state">
            <strong>{t("page.admin.tracking.emptyTitle")}</strong>
            <span>{t("page.admin.tracking.emptyText")}</span>
          </div>
        </section>
      ) : (
        <>
          {trackedDrivers.length > 0 ? (
            <LiveLocationMap drivers={trackedDrivers} />
          ) : (
            <section className="panel">
              <div className="empty-state">
                <strong>لا يوجد موقع مباشر نشط</strong>
                <span>ستظهر مواقع السائقين بعد بدء التوصيل ومشاركة الموقع.</span>
              </div>
            </section>
          )}
          <section className="cards-grid">
            {visibleDrivers.map((driver) => (
              <article className="driver-card" key={driver.id}>
                <h2>{driver.name}</h2>
                <p>{driver.companies?.name || t("ui.orders.unknownSupplier")}</p>
                <dl>
                  <div>
                    <dt>{t("common.status")}</dt>
                    <dd>{driver.is_online ? t("page.admin.tracking.online") : t("page.admin.tracking.offline")}</dd>
                  </div>
                  <div>
                    <dt>{t("page.admin.tracking.currentOrder")}</dt>
                    <dd>{driver.activeOrder?.public_code ?? t("page.admin.tracking.noCurrentOrder")}</dd>
                  </div>
                  <div>
                    <dt>{t("page.admin.tracking.lastLocation")}</dt>
                    <dd>{formatLocation(driver.lastLocation, t)}</dd>
                  </div>
                  <div>
                    <dt>حالة الموقع</dt>
                    <dd>{locationFreshnessLabel(driver.lastLocation)}</dd>
                  </div>
                  <div>
                    <dt>{t("page.admin.tracking.lastUpdate")}</dt>
                    <dd>{formatDateTime(driver.lastLocation?.recorded_at, language)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>{t("page.admin.tracking.activeOrders")}</h2>
                <p>{t("page.admin.tracking.activeOrdersSubtitle")}</p>
              </div>
            </div>
            {visibleOrders.length === 0 ? (
              <div className="empty-state">
                <strong>{t("page.admin.tracking.noActiveOrdersTitle")}</strong>
                <span>{t("page.admin.tracking.noActiveOrdersText")}</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("page.admin.tracking.order")}</th>
                      <th>{t("page.admin.tracking.supplier")}</th>
                      <th>{t("page.admin.tracking.area")}</th>
                      <th>{t("page.admin.tracking.driver")}</th>
                      <th>{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.public_code || order.id}</td>
                        <td>{order.companies?.name || "-"}</td>
                        <td>{order.delivery_area || "-"}</td>
                        <td>{order.drivers?.name || "-"}</td>
                        <td>{orderStatusLabel(t, order.status)}</td>
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
      .select("id, public_code, company_id, driver_id, delivery_area, status, companies(name), drivers(name)")
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

  const ordersByDriverId = new Map();
  (ordersResult.data ?? []).forEach((order) => {
    if (order.driver_id && !ordersByDriverId.has(order.driver_id)) {
      ordersByDriverId.set(order.driver_id, order);
    }
  });

  return {
    companies: companiesResult.data ?? [],
    orders: ordersResult.data ?? [],
    drivers: drivers.map((driver) => ({
      ...driver,
      lastLocation: locationsByDriverId.get(driver.id) ?? null,
      activeOrder: ordersByDriverId.get(driver.id) ?? null,
    })),
  };
}

async function fetchLatestDriverLocations(driverIds, companyIds) {
  let query = supabase
    .from("driver_locations")
    .select("id, driver_id, company_id, order_id, latitude, longitude, accuracy, heading, speed, recorded_at, updated_at, source")
    .in("driver_id", driverIds)
    .order("recorded_at", { ascending: false });

  if (companyIds.length > 0) {
    query = query.in("company_id", companyIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

function formatLocation(location, t) {
  if (!location) return t("page.admin.tracking.noTracking");
  return `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`;
}

function formatDateTime(value, language = "ar") {
  if (!value) return "-";
  return new Date(value).toLocaleString(language === "ar" ? "ar-OM" : "en-OM");
}

function locationFreshnessLabel(location) {
  if (!location?.recorded_at) return "لا يوجد موقع مباشر";
  return Date.now() - new Date(location.recorded_at).getTime() > LOCATION_STALE_MS
    ? "قديم - آخر تحديث قبل أكثر من دقيقتين"
    : "مباشر";
}

function LiveLocationMap({ drivers }) {
  const bounds = getBounds(drivers.map((driver) => driver.lastLocation).filter(Boolean));
  return (
    <section className="panel live-map-panel">
      <div className="panel-header">
        <div>
          <h2>خريطة التوصيل المباشر</h2>
          <p>عرض تشغيلي مبسط لآخر مواقع السائقين النشطين بدون بيانات عميل حساسة.</p>
        </div>
      </div>
      <div className="live-map-canvas" role="img" aria-label="مواقع السائقين النشطين">
        {drivers.map((driver) => {
          const point = toCanvasPoint(driver.lastLocation, bounds);
          const stale = Date.now() - new Date(driver.lastLocation.recorded_at).getTime() > LOCATION_STALE_MS;
          return (
            <div
              className={stale ? "live-map-marker stale" : "live-map-marker"}
              key={driver.id}
              style={{ insetInlineStart: `${point.x}%`, top: `${point.y}%` }}
              title={`${driver.name} - ${driver.activeOrder?.public_code || ""}`}
            >
              <span />
              <strong>{driver.name}</strong>
              <small>{driver.activeOrder?.public_code}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getBounds(locations) {
  const lats = locations.map((location) => Number(location.latitude));
  const lngs = locations.map((location) => Number(location.longitude));
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

function toCanvasPoint(location, bounds) {
  const latRange = bounds.maxLat - bounds.minLat || 0.001;
  const lngRange = bounds.maxLng - bounds.minLng || 0.001;
  const x = ((Number(location.longitude) - bounds.minLng) / lngRange) * 80 + 10;
  const y = 90 - ((Number(location.latitude) - bounds.minLat) / latRange) * 80;
  return { x, y };
}
