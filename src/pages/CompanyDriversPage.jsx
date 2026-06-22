import { useEffect, useState } from "react";
import { getDriversByCompanyFromSupabase } from "../services/driverService.js";

export default function CompanyDriversPage({ companyId }) {
  const [companyDrivers, setCompanyDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDrivers() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const supabaseDrivers = await getDriversByCompanyFromSupabase(companyId);
        if (!cancelled) setCompanyDrivers(supabaseDrivers);
      } catch {
        if (!cancelled) {
          setCompanyDrivers([]);
          setErrorMessage("تعذر تحميل السائقين من قاعدة البيانات.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadDrivers();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  function showDriverManagementPending() {
    setMessage("سيتم تفعيل إدارة السائقين في المرحلة التالية.");
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>السائقون</h1>
        </div>
        <button type="button" onClick={showDriverManagementPending}>
          إضافة سائق
        </button>
      </header>

      {message ? <p className="auth-alert success">{message}</p> : null}

      <section className="cards-grid">
        {isLoading ? (
          <p className="empty-state">جاري تحميل السائقين...</p>
        ) : errorMessage ? (
          <p className="empty-state">{errorMessage}</p>
        ) : companyDrivers.length === 0 ? (
          <div className="empty-state">
            <strong>لا يوجد سائقون حتى الآن</strong>
            <span>ستظهر هنا بيانات السائقين بعد إضافتهم إلى حساب الشركة.</span>
          </div>
        ) : (
          companyDrivers.map((driver) => (
            <article className="driver-card" key={driver.id}>
              <div>
                <h2>{driver.name}</h2>
                <p>{driver.phone}</p>
              </div>
              <dl>
                <div>
                  <dt>المركبة</dt>
                  <dd>{driver.vehicle}</dd>
                </div>
                <div>
                  <dt>الحالة</dt>
                  <dd>{driver.status}</dd>
                </div>
                <div>
                  <dt>كاش اليوم</dt>
                  <dd>{driver.cashToday.toFixed(3)} ر.ع</dd>
                </div>
              </dl>
              <div className="row-actions">
                <button type="button" onClick={showDriverManagementPending}>
                  تعديل
                </button>
                <button type="button" className="ghost" onClick={showDriverManagementPending}>
                  حذف
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
