import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import {
  formatMoney,
  getFinancialRows,
  summarizeFinance,
  summarizeFinanceBySupplier,
} from "../services/adminFinanceService.js";

export default function AdminFinancePage({ onNavigate }) {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFinance() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextRows = await getFinancialRows();
        if (!cancelled) setRows(nextRows);
      } catch (error) {
        if (!cancelled) {
          setRows([]);
          setErrorMessage(error.message || t("page.admin.finance.loadError"));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadFinance();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const summary = summarizeFinance(rows);
  const supplierRows = summarizeFinanceBySupplier(rows);

  return (
    <div className="page">
      <PageHeader eyebrowKey="page.admin.finance.eyebrow" titleKey="page.admin.finance.title" />

      {errorMessage ? <p className="auth-alert error">{t("page.admin.finance.loadError")}</p> : null}

      <section className="metrics-grid admin-metrics-grid">
        <MetricCard label={t("page.admin.finance.totalSales")} value={formatMoney(summary.totalSales)} tone="primary" />
        <MetricCard label={t("page.admin.finance.cardSales")} value={formatMoney(summary.cardSales)} />
        <MetricCard label={t("page.admin.finance.cashSales")} value={formatMoney(summary.cashSales)} />
        <MetricCard label={t("page.admin.finance.falajCommission")} value={formatMoney(summary.falajCommission)} tone="cash" />
        <MetricCard label={t("page.admin.finance.supplierPayable")} value={formatMoney(summary.supplierPayable)} />
        <MetricCard label={t("page.admin.finance.falajReceivable")} value={formatMoney(summary.falajReceivableFromSuppliers)} />
        <MetricCard label={t("page.admin.finance.netTransfers")} value={formatMoney(summary.netTransferAmount)} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{t("page.admin.finance.bySupplier")}</h2>
            <p>{t("page.admin.finance.bySupplierSubtitle")}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">{t("page.admin.finance.loading")}</p>
        ) : errorMessage ? (
          <p className="empty-state">{t("page.admin.finance.loadError")}</p>
        ) : supplierRows.length === 0 ? (
          <div className="empty-state">
            <strong>{t("page.admin.finance.emptyTitle")}</strong>
            <span>{t("page.admin.finance.emptyText")}</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("page.admin.finance.supplier")}</th>
                  <th>{t("page.admin.finance.orderCount")}</th>
                  <th>{t("page.admin.finance.totalSalesColumn")}</th>
                  <th>{t("page.admin.finance.cash")}</th>
                  <th>{t("page.admin.finance.card")}</th>
                  <th>{t("page.admin.finance.falajCommission")}</th>
                  <th>{t("page.admin.finance.supplierNet")}</th>
                  <th>{t("page.admin.finance.supplierOwes")}</th>
                  <th>{t("page.admin.finance.settlement")}</th>
                  <th>{t("common.actions")}</th>
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
                        {t("page.admin.finance.viewSupplierAccount")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
