import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import {
  formatMoney,
  getFinancialRows,
  getSuppliers,
  summarizeFinance,
  summarizeFinanceBySupplier,
} from "../services/adminFinanceService.js";

export default function AdminFinancePage({ orders, onNavigate }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadFinance() {
      try {
        const suppliers = await getSuppliers();
        const nextRows = await getFinancialRows(orders, suppliers);
        if (!cancelled) setRows(nextRows);
      } catch {
        if (!cancelled) setRows([]);
      }
    }

    loadFinance();

    return () => {
      cancelled = true;
    };
  }, [orders]);

  const summary = summarizeFinance(rows);
  const supplierRows = summarizeFinanceBySupplier(rows);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الإدارة المالية</p>
          <h1>المالية والتسويات</h1>
        </div>
      </header>

      <section className="metrics-grid admin-metrics-grid">
        <MetricCard label="إجمالي المبيعات" value={formatMoney(summary.totalSales)} tone="primary" />
        <MetricCard label="مبيعات البطاقة" value={formatMoney(summary.cardSales)} />
        <MetricCard label="مبيعات الكاش" value={formatMoney(summary.cashSales)} />
        <MetricCard label="عمولة فلج" value={formatMoney(summary.falajCommission)} tone="cash" />
        <MetricCard label="مستحقات الموردين" value={formatMoney(summary.supplierPayable)} />
        <MetricCard label="مستحق على الموردين" value={formatMoney(summary.falajReceivableFromSuppliers)} />
        <MetricCard label="صافي التحويلات" value={formatMoney(summary.netTransferAmount)} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>حسب المورد</h2>
            <p>الأرقام مبنية على القيود المالية المكتملة، مع fallback آمن من الطلبات الحالية.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المورد</th>
                <th>عدد الطلبات</th>
                <th>إجمالي المبيعات</th>
                <th>كاش</th>
                <th>بطاقة</th>
                <th>عمولة فلج</th>
                <th>صافي المورد</th>
                <th>مستحق على المورد</th>
                <th>التسوية</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {supplierRows.map((supplier) => (
                <tr key={supplier.companyId}>
                  <td>{supplier.supplierName}</td>
                  <td>{supplier.orderCount}</td>
                  <td>{formatMoney(supplier.totalSales)}</td>
                  <td>{formatMoney(supplier.cashSales)}</td>
                  <td>{formatMoney(supplier.cardSales)}</td>
                  <td>{formatMoney(supplier.falajCommission)}</td>
                  <td>{formatMoney(supplier.supplierNet)}</td>
                  <td>{formatMoney(supplier.supplierOwesFalaj)}</td>
                  <td>{supplier.settlementStatus}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onNavigate?.(`/admin/suppliers/${supplier.companyId}/account`)}
                    >
                      عرض حساب المورد
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
