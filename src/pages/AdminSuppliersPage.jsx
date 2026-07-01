import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import {
  formatMoney,
  getSuppliers,
  supplierStatusLabel,
  updateSupplierCommission,
  updateSupplierStatus,
} from "../services/adminFinanceService.js";

const STATUS_FILTERS = [
  { value: "all", labelKey: "page.admin.suppliers.status.all" },
  { value: "approved", labelKey: "page.admin.suppliers.status.approved" },
  { value: "pending", labelKey: "page.admin.suppliers.status.pending" },
  { value: "suspended", labelKey: "page.admin.suppliers.status.suspended" },
];

export default function AdminSuppliersPage({ onNavigate }) {
  const { language, t } = useI18n();
  const [suppliers, setSuppliers] = useState([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSuppliers() {
      setErrorMessage("");
      try {
        const nextSuppliers = await getSuppliers({ allowMockFallback: false });
        if (!cancelled) setSuppliers(nextSuppliers);
      } catch {
        if (!cancelled) {
          setSuppliers([]);
          setErrorMessage(t("page.admin.suppliers.loadError"));
        }
      }
    }

    loadSuppliers();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const visibleSuppliers =
    activeStatus === "all"
      ? suppliers
      : suppliers.filter((supplier) => supplier.status === activeStatus);

  async function setStatus(companyId, status) {
    setMessage("");
    setErrorMessage("");

    if (!isUuid(companyId)) {
      setErrorMessage(t("page.admin.suppliers.demoActionError"));
      return;
    }

    try {
      await updateSupplierStatus(companyId, status);
      setSuppliers((current) =>
        current.map((supplier) =>
          supplier.id === companyId
            ? { ...supplier, status, isActive: status === "approved" }
            : supplier
        )
      );
      setMessage(t("page.admin.suppliers.statusUpdated"));
    } catch (error) {
      setErrorMessage(error.message || t("page.admin.suppliers.statusUpdateError"));
    }
  }

  async function editCommission(supplier) {
    setMessage("");
    setErrorMessage("");

    if (!isUuid(supplier.id)) {
      setErrorMessage(t("page.admin.suppliers.demoActionError"));
      return;
    }

    const nextValue = window.prompt(t("page.admin.suppliers.commissionPrompt"), String(supplier.commissionRate ?? 0));
    if (nextValue === null) return;

    const commissionRate = Number(nextValue);
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      setErrorMessage(t("page.admin.suppliers.commissionRangeError"));
      return;
    }

    try {
      await updateSupplierCommission(supplier.id, commissionRate);
      setSuppliers((current) =>
        current.map((item) => (item.id === supplier.id ? { ...item, commissionRate } : item))
      );
      setMessage(t("page.admin.suppliers.commissionUpdated"));
    } catch (error) {
      setErrorMessage(error.message || t("page.admin.suppliers.commissionUpdateError"));
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrowKey="page.admin.suppliers.eyebrow"
        titleKey="page.admin.suppliers.title"
        subtitleKey="page.admin.suppliers.subtitle"
      />

      <section className="status-tabs" aria-label={t("page.admin.suppliers.filterLabel")}>
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={activeStatus === filter.value ? "active" : "ghost"}
            onClick={() => setActiveStatus(filter.value)}
          >
            {t(filter.labelKey)}
          </button>
        ))}
      </section>

      {message ? <p className="auth-alert success">{message}</p> : null}
      {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}

      <section className="panel">
        {visibleSuppliers.length === 0 && !errorMessage ? (
          <p className="empty-state">{t("page.admin.suppliers.empty")}</p>
        ) : errorMessage ? (
          <p className="empty-state">{t("page.admin.suppliers.loadError")}</p>
        ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("page.admin.suppliers.companyName")}</th>
                <th>{t("common.phone")}</th>
                <th>{t("common.email")}</th>
                <th>{t("common.status")}</th>
                <th>{t("page.admin.suppliers.commission")}</th>
                <th>{t("page.admin.suppliers.registrationDate")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleSuppliers.map((supplier) => {
                const canRunActions = isUuid(supplier.id);

                return (
                  <tr key={supplier.id}>
                    <td>{supplier.name}</td>
                    <td>{supplier.phone}</td>
                    <td>{supplier.email}</td>
                    <td>
                      <span className={`status ${supplier.status}`}>
                        {supplierDisplayStatusLabel(t, supplier.status)}
                      </span>
                    </td>
                    <td>{Number(supplier.commissionRate || 0).toFixed(2)}%</td>
                    <td>{formatDate(supplier.createdAt, language)}</td>
                    <td>
                      <div className="row-actions wide-actions">
                        <button type="button" onClick={() => onNavigate?.(`/admin/suppliers/${supplier.id}`)}>
                          {t("page.admin.suppliers.viewDetails")}
                        </button>
                        <button type="button" className="ghost" onClick={() => onNavigate?.("/admin/product-moderation")}>
                          {t("page.admin.suppliers.viewCatalog")}
                        </button>
                        <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "approved")} disabled={!canRunActions}>
                          {t("page.admin.suppliers.approve")}
                        </button>
                        <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "rejected")} disabled={!canRunActions}>
                          {t("page.admin.suppliers.reject")}
                        </button>
                        <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "suspended")} disabled={!canRunActions}>
                          {t("page.admin.suppliers.suspend")}
                        </button>
                        <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "approved")} disabled={!canRunActions}>
                          {t("page.admin.suppliers.reactivate")}
                        </button>
                        <button type="button" className="ghost" onClick={() => editCommission(supplier)} disabled={!canRunActions}>
                          {t("page.admin.suppliers.editCommission")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </section>

      <section className="panel overview">
        <h2>{t("page.admin.suppliers.summaryTitle")}</h2>
        <p>
          {t("page.admin.suppliers.summary")
            .replace("{count}", suppliers.length)
            .replace("{average}", formatMoney(
            suppliers.reduce((sum, supplier) => sum + Number(supplier.commissionRate || 0), 0) /
              Math.max(suppliers.length, 1)
          ).replace("ر.ع", "%"))}
        </p>
      </section>
    </div>
  );
}

function formatDate(value, language = "ar") {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(language === "ar" ? "ar-OM" : "en-OM");
}

function supplierDisplayStatusLabel(t, status) {
  const translated = t(`page.admin.suppliers.status.${status}`);
  return translated === `page.admin.suppliers.status.${status}` ? supplierStatusLabel(status) : translated;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value)
  );
}
