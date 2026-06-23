import { useEffect, useState } from "react";
import { getDriversLiveLocationsByCompanyFromSupabase } from "../services/driverService.js";

const LIVE_TRACKING_LOAD_ERROR = "تعذر تحميل مواقع السائقين من قاعدة البيانات. حاول التحديث مرة أخرى.";

export default function CompanyDriversLivePage({ companyId }) {
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadLiveLocations() {
      setIsLoading(true);
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

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const hasLocations = drivers.some((driver) => driver.lastLocation);

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
      ) : !hasLocations ? (
        <section className="panel">
          <div className="empty-state">
            <strong>لا يوجد تتبع نشط حاليًا</strong>
            <span>سيظهر موقع السائق هنا بعد بدء مشاركة الموقع من صفحة السائق.</span>
          </div>
        </section>
      ) : (
        <section className="cards-grid">
          {drivers.map((driver) => (
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
                  <dt>المركبة</dt>
                  <dd>{driver.vehicle}</dd>
                </div>
                <div>
                  <dt>آخر موقع</dt>
                  <dd>{formatLocation(driver.lastLocation)}</dd>
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
      )}
    </div>
  );
}

function formatLocation(location) {
  if (!location) return "لا يوجد تتبع نشط حاليًا";
  return `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`;
}
