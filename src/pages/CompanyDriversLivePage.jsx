import { useEffect, useState } from "react";
import { getDriversLiveLocationsByCompanyFromSupabase } from "../services/driverService.js";
import { supabase } from "../lib/supabaseClient.js";

const LOCATION_STALE_MS = 2 * 60 * 1000;

const LIVE_TRACKING_LOAD_ERROR = "تعذر تحميل مواقع السائقين من قاعدة البيانات. حاول التحديث مرة أخرى.";

export default function CompanyDriversLivePage({ companyId }) {
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    let pollingTimer = null;
    let channel = null;

    async function loadLiveLocations(options = {}) {
      if (!options.silent) setIsLoading(true);
      setErrorMessage("");

      try {
        const nextDrivers = await getDriversLiveLocationsByCompanyFromSupabase(companyId);
        if (!cancelled) setDrivers(nextDrivers);
      } catch (error) {
        if (!cancelled) {
          setDrivers([]);
          setErrorMessage(LIVE_TRACKING_LOAD_ERROR);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadLiveLocations();
    pollingTimer = window.setInterval(() => loadLiveLocations({ silent: true }), 30000);

    if (supabase && companyId) {
      channel = supabase
        .channel(`company-driver-locations-${companyId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "driver_locations",
            filter: `company_id=eq.${companyId}`,
          },
          () => loadLiveLocations({ silent: true })
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      if (pollingTimer) window.clearInterval(pollingTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [companyId]);

  const activeDrivers = drivers.filter((driver) => driver.activeOrder);
  const trackedDrivers = activeDrivers.filter((driver) => driver.lastLocation);
  const hasActiveDeliveries = activeDrivers.length > 0;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">متابعة السائقين</p>
          <h1>التتبع المباشر لسائقي الشركة</h1>
          <p>تعرض هذه الصفحة آخر مواقع محفوظة في Supabase فقط عند توفرها.</p>
        </div>
      </header>

      {isLoading ? (
        <section className="panel">
          <p className="empty-state">جاري تحميل مواقع السائقين...</p>
        </section>
      ) : errorMessage ? (
        <section className="panel">
          <p className="empty-state">{errorMessage}</p>
        </section>
      ) : drivers.length === 0 ? (
        <section className="panel">
          <div className="empty-state">
            <strong>لا يوجد سائقون حاليًا</strong>
            <span>ستظهر هنا مواقع السائقين بعد إضافتهم وتفعيل مشاركة الموقع.</span>
          </div>
        </section>
      ) : !hasActiveDeliveries ? (
        <section className="panel">
          <div className="empty-state">
            <strong>لا يوجد تتبع نشط حاليًا</strong>
            <span>سيظهر موقع السائق هنا بعد بدء مشاركة الموقع من صفحة السائق.</span>
          </div>
        </section>
      ) : (
        <>
        {trackedDrivers.length > 0 ? (
          <LiveLocationMap drivers={trackedDrivers} />
        ) : (
          <section className="panel">
            <div className="empty-state">
              <strong>لا يوجد موقع مباشر حاليًا</strong>
              <span>الطلب النشط مرئي، وسيظهر موقع السائق عند تفعيل التتبع من جهازه.</span>
            </div>
          </section>
        )}
        <section className="cards-grid">
          {activeDrivers.map((driver) => (
            <article className="driver-card" key={driver.id}>
              <div className="driver-card-head">
                <div>
                  <h2>{driver.name}</h2>
                  <p>{driver.status}</p>
                </div>
                <span className={`status ${driver.isActive ? "active" : "inactive"}`}>
                  {driver.isActive ? "نشط" : "موقوف"}
                </span>
              </div>
              <dl>
                <div>
                  <dt>الطلب النشط</dt>
                  <dd>{driver.activeOrder?.public_code ?? "لا يوجد طلب قيد التوصيل"}</dd>
                </div>
                <div>
                  <dt>المركبة</dt>
                  <dd>{driver.vehicle}</dd>
                </div>
                <div>
                  <dt>آخر موقع</dt>
                  <dd>{formatLocation(driver.lastLocation)}</dd>
                </div>
                <div>
                  <dt>حالة الموقع</dt>
                  <dd>{locationFreshnessLabel(driver.lastLocation)}</dd>
                </div>
                <div>
                  <dt>الدقة</dt>
                  <dd>{driver.lastLocation?.accuracy ? `${Math.round(driver.lastLocation.accuracy)} متر` : "-"}</dd>
                </div>
                <div>
                  <dt>آخر تحديث</dt>
                  <dd>{driver.lastLocation?.recorded_at ? new Date(driver.lastLocation.recorded_at).toLocaleString("ar-OM") : "-"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
        </>
      )}
    </div>
  );
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
          <p>عرض تشغيلي مبسط لآخر مواقع السائقين النشطين.</p>
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

function formatLocation(location) {
  if (!location) return "لا يوجد تتبع نشط حاليًا";
  return `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`;
}
