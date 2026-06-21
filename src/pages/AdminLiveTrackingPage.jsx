import { useMemo, useState } from "react";
import { MOCK_SUPPLIERS, supplierStatusLabel } from "../services/adminFinanceService.js";

const ACTIVE_ORDER_STATUSES = ["accepted", "assigned", "en_route", "arrived"];

export default function AdminLiveTrackingPage({ orders, drivers }) {
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const activeOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesActive = ACTIVE_ORDER_STATUSES.includes(order.status);
        const matchesCompany = companyFilter === "all" || order.companyId === companyFilter;
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        return matchesActive && matchesCompany && matchesStatus;
      }),
    [companyFilter, orders, statusFilter]
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">التتبع العام</p>
          <h1>متابعة الطلبات والسائقين</h1>
        </div>
      </header>

      <section className="panel overview">
        <div className="filter-row">
          <label>
            المورد
            <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
              <option value="all">كل الموردين</option>
              {MOCK_SUPPLIERS.map((supplier) => (
                <option value={supplier.id} key={supplier.id}>
                  {supplier.name} - {supplierStatusLabel(supplier.status)}
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
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="cards-grid">
        {drivers.map((driver) => (
          <article className="driver-card" key={driver.id}>
            <h2>{driver.name}</h2>
            <p>{driver.status}</p>
            <dl>
              <div>
                <dt>الطلب الحالي</dt>
                <dd>{activeOrders.find((order) => order.driverId === driver.id)?.id ?? "لا يوجد"}</dd>
              </div>
              <div>
                <dt>آخر موقع معروف</dt>
                <dd>لا يوجد تتبع نشط حاليًا</dd>
              </div>
              <div>
                <dt>آخر تحديث</dt>
                <dd>-</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>الطلبات الجارية</h2>
            <p>لا تعتمد هذه الصفحة على GPS حقيقي في هذه المرحلة.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الطلب</th>
                <th>الزبون</th>
                <th>المنطقة</th>
                <th>السائق</th>
                <th>الحالة</th>
                <th>آخر موقع</th>
              </tr>
            </thead>
            <tbody>
              {activeOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customer}</td>
                  <td>{order.area}</td>
                  <td>{drivers.find((driver) => driver.id === order.driverId)?.name ?? "-"}</td>
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
