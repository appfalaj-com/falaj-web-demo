import { useEffect, useMemo, useState } from "react";
import {
  formatMoney,
  getFinancialRows,
  getSuppliers,
  supplierStatusLabel,
} from "../services/adminFinanceService.js";

export default function AdminSupplierAccountPage({ companyId, orders }) {
  const [suppliers, setSuppliers] = useState([]);
  const [rows, setRows] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const nextSuppliers = await getSuppliers();
        const nextRows = await getFinancialRows(orders, nextSuppliers);
        if (!cancelled) {
          setSuppliers(nextSuppliers);
          setRows(nextRows);
        }
      } catch {
        if (!cancelled) {
          setSuppliers([]);
          setRows([]);
        }
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, [orders]);

  const supplier = suppliers.find((item) => item.id === companyId);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (row.companyId !== companyId) return false;
        const rowDate = row.createdAt ? new Date(row.createdAt) : null;
        if (dateFrom && rowDate && rowDate < new Date(dateFrom)) return false;
        if (dateTo && rowDate && rowDate > new Date(dateTo)) return false;
        return true;
      }),
    [companyId, dateFrom, dateTo, rows]
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">حساب المورد</p>
          <h1>{supplier?.name ?? "مورد غير محدد"}</h1>
        </div>
      </header>

      <section className="cards-grid supplier-detail-grid">
        <SupplierInfo title="بيانات الشركة" rows={[["الاسم", supplier?.name], ["الحالة", supplierStatusLabel(supplier?.status)]]} />
        <SupplierInfo title="بيانات التواصل" rows={[["الهاتف", supplier?.phone], ["الإيميل", supplier?.email]]} />
        <SupplierInfo
          title="بيانات البنك"
          rows={[
            ["البنك", supplier?.bankName],
            ["اسم الحساب", supplier?.bankAccountName],
            ["رقم الحساب", supplier?.bankAccountNumber],
            ["IBAN", supplier?.iban],
          ]}
        />
        <SupplierInfo title="العمولة" rows={[["نسبة عمولة فلج", `${Number(supplier?.commissionRate || 0).toFixed(2)}%`]]} />
      </section>

      <section className="panel overview">
        <h2>فلتر التاريخ</h2>
        <div className="filter-row">
          <label>
            من
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label>
            إلى
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>قيمة الطلب</th>
                <th>طريقة الدفع</th>
                <th>مستلم الكاش</th>
                <th>عمولة فلج</th>
                <th>صافي المورد</th>
                <th>حالة التسوية</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.orderId}</td>
                  <td>{formatMoney(row.grossAmount)}</td>
                  <td>{row.paymentMethod}</td>
                  <td>{row.cashCollectedBy || "-"}</td>
                  <td>{formatMoney(row.falajCommissionAmount)}</td>
                  <td>{formatMoney(row.supplierNetAmount)}</td>
                  <td>{row.settlementStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SupplierInfo({ title, rows }) {
  return (
    <article className="driver-card">
      <h2>{title}</h2>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "-"}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
