import { getDrivers } from "../services/driverService.js";

export default function CompanyDriversPage({ drivers }) {
  const companyDrivers = getDrivers(drivers);

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
