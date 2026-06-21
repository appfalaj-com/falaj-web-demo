import { useMemo } from "react";
import { getDriversByCompany } from "../services/driverService.js";

const ACTIVE_STATUSES = ["assigned", "en_route", "arrived"];

export default function CompanyDriversLivePage({ companyId, orders, drivers }) {
  const companyDrivers = getDriversByCompany(companyId, drivers);
  const companyOrders = useMemo(
    () => orders.filter((order) => order.companyId === companyId || companyId === "company-1"),
    [companyId, orders]
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">متابعة السائقين</p>
          <h1>التتبع المباشر لسائقي الشركة</h1>
        </div>
      </header>

      <section className="cards-grid">
        {companyDrivers.map((driver) => {
          const currentOrder = companyOrders.find(
            (order) => order.driverId === driver.id && ACTIVE_STATUSES.includes(order.status)
          );

          return (
            <article className="driver-card" key={driver.id}>
              <h2>{driver.name}</h2>
              <p>{driver.status}</p>
              <dl>
                <div>
                  <dt>الطلب الحالي</dt>
                  <dd>{currentOrder?.id ?? "لا يوجد"}</dd>
                </div>
                <div>
                  <dt>ماذا يوصل</dt>
                  <dd>{currentOrder ? `${currentOrder.waterType} - ${currentOrder.volume}` : "-"}</dd>
                </div>
                <div>
                  <dt>الزبون والمنطقة</dt>
                  <dd>{currentOrder ? `${currentOrder.customer} - ${currentOrder.area}` : "-"}</dd>
                </div>
                <div>
                  <dt>وقت الوصول المتوقع</dt>
                  <dd>-</dd>
                </div>
                <div>
                  <dt>آخر موقع معروف</dt>
                  <dd>لا يوجد تتبع نشط حاليًا</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>جدول توصيلات اليوم</h2>
            <p>سيتم ربط GPS الحقيقي لاحقًا عند تجهيز تطبيق السائق أو Web GPS بشكل آمن.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الطلب</th>
                <th>السائق</th>
                <th>الزبون</th>
                <th>المنطقة</th>
                <th>الحالة</th>
                <th>التتبع</th>
              </tr>
            </thead>
            <tbody>
              {companyOrders
                .filter((order) => ACTIVE_STATUSES.includes(order.status))
                .map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{companyDrivers.find((driver) => driver.id === order.driverId)?.name ?? "-"}</td>
                    <td>{order.customer}</td>
                    <td>{order.area}</td>
                    <td>{order.status}</td>
                    <td>لا يوجد تتبع نشط حاليًا</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
