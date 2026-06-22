import { useEffect, useState } from "react";
import {
  formatMoney,
  getSuppliers,
  supplierStatusLabel,
  updateSupplierCommission,
  updateSupplierStatus,
} from "../services/adminFinanceService.js";

const STATUS_FILTERS = [
  { value: "all", label: "الكل" },
  { value: "approved", label: "نشط" },
  { value: "pending", label: "قيد الإعداد" },
  { value: "suspended", label: "موقوف" },
];

const SUPPLIER_STATUS_LABELS = {
  pending: "قيد الإعداد",
  approved: "نشط",
  rejected: "غير نشط",
  suspended: "موقوف",
};

export default function AdminSuppliersPage({ onNavigate }) {
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
          setErrorMessage("تعذر تحميل الموردين من قاعدة البيانات.");
        }
      }
    }

    loadSuppliers();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleSuppliers =
    activeStatus === "all"
      ? suppliers
      : suppliers.filter((supplier) => supplier.status === activeStatus);

  async function setStatus(companyId, status) {
    setMessage("");
    setErrorMessage("");

    if (!isUuid(companyId)) {
      setErrorMessage("لا يمكن تنفيذ العملية على بيانات تجريبية.");
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
      setMessage("تم تحديث حالة المورد.");
    } catch (error) {
      setErrorMessage(error.message || "تعذر تحديث حالة المورد.");
    }
  }

  async function editCommission(supplier) {
    setMessage("");
    setErrorMessage("");

    if (!isUuid(supplier.id)) {
      setErrorMessage("لا يمكن تنفيذ العملية على بيانات تجريبية.");
      return;
    }

    const nextValue = window.prompt("نسبة عمولة فلج", String(supplier.commissionRate ?? 0));
    if (nextValue === null) return;

    const commissionRate = Number(nextValue);
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      setErrorMessage("نسبة العمولة يجب أن تكون بين 0 و 100.");
      return;
    }

    try {
      await updateSupplierCommission(supplier.id, commissionRate);
      setSuppliers((current) =>
        current.map((item) => (item.id === supplier.id ? { ...item, commissionRate } : item))
      );
      setMessage("تم تعديل نسبة العمولة.");
    } catch (error) {
      setErrorMessage(error.message || "تعذر تعديل نسبة العمولة.");
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الإدارة</p>
          <h1>إدارة الموردين المعتمدين</h1>
          <p>إدارة الشركات التي تم قبولها أو تفعيلها داخل منصة فلج.</p>
        </div>
      </header>

      <section className="status-tabs" aria-label="تصفية الموردين">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={activeStatus === filter.value ? "active" : "ghost"}
            onClick={() => setActiveStatus(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </section>

      {message ? <p className="auth-alert success">{message}</p> : null}
      {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}

      <section className="panel">
        {visibleSuppliers.length === 0 && !errorMessage ? (
          <p className="empty-state">لا توجد شركات موردة حتى الآن.</p>
        ) : errorMessage ? (
          <p className="empty-state">تعذر تحميل الموردين من قاعدة البيانات.</p>
        ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>اسم الشركة</th>
                <th>الهاتف</th>
                <th>الإيميل</th>
                <th>الحالة</th>
                <th>عمولة فلج</th>
                <th>تاريخ التسجيل</th>
                <th>الإجراءات</th>
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
                        {supplierDisplayStatusLabel(supplier.status)}
                      </span>
                    </td>
                    <td>{Number(supplier.commissionRate || 0).toFixed(2)}%</td>
                    <td>{formatDate(supplier.createdAt)}</td>
                    <td>
                      <div className="row-actions wide-actions">
                        <button type="button" onClick={() => onNavigate?.(`/admin/suppliers/${supplier.id}/account`)}>
                          عرض التفاصيل
                        </button>
                        <button type="button" className="ghost" onClick={() => onNavigate?.("/admin/product-moderation")}>
                          عرض كتالوج المورد
                        </button>
                        <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "approved")} disabled={!canRunActions}>
                          اعتماد
                        </button>
                        <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "rejected")} disabled={!canRunActions}>
                          رفض
                        </button>
                        <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "suspended")} disabled={!canRunActions}>
                          إيقاف
                        </button>
                        <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "approved")} disabled={!canRunActions}>
                          إعادة تفعيل
                        </button>
                        <button type="button" className="ghost" onClick={() => editCommission(supplier)} disabled={!canRunActions}>
                          تعديل العمولة
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
        <h2>ملخص الموردين</h2>
        <p>
          إجمالي الموردين: {suppliers.length}، متوسط العمولة:{" "}
          {formatMoney(
            suppliers.reduce((sum, supplier) => sum + Number(supplier.commissionRate || 0), 0) /
              Math.max(suppliers.length, 1)
          ).replace("ر.ع", "%")}
        </p>
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-OM");
}

function supplierDisplayStatusLabel(status) {
  return SUPPLIER_STATUS_LABELS[status] ?? supplierStatusLabel(status);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value)
  );
}
