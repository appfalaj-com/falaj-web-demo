import { useEffect, useState } from "react";
import { getDriversByCompany, getDriversByCompanyFromSupabase } from "../services/driverService.js";

export default function CompanyDriversPage({ companyId, drivers }) {
  const [companyDrivers, setCompanyDrivers] = useState(() => getDriversByCompany(companyId, drivers));

  useEffect(() => {
    let cancelled = false;

    async function loadDrivers() {
      try {
        const supabaseDrivers = await getDriversByCompanyFromSupabase(companyId);
        if (!cancelled && supabaseDrivers.length > 0) {
          setCompanyDrivers(supabaseDrivers);
        } else if (!cancelled) {
          setCompanyDrivers(getDriversByCompany(companyId, drivers));
        }
      } catch {
        if (!cancelled) {
          setCompanyDrivers(getDriversByCompany(companyId, drivers));
        }
      }
    }

    loadDrivers();

    return () => {
      cancelled = true;
    };
  }, [companyId, drivers]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>السائقون</h1>
        </div>
      </header>

      <section className="cards-grid">
        {companyDrivers.map((driver) => (
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
          </article>
        ))}
      </section>
    </div>
  );
}
