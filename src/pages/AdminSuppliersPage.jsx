import { useEffect, useState } from "react";
import {
  formatMoney,
  getSuppliers,
  supplierStatusLabel,
  updateSupplierCommission,
  updateSupplierStatus,
} from "../services/adminFinanceService.js";

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "suspended"];

export default function AdminSuppliersPage({ onNavigate }) {
  const [suppliers, setSuppliers] = useState([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSuppliers() {
      try {
        const nextSuppliers = await getSuppliers();
        if (!cancelled) setSuppliers(nextSuppliers);
      } catch {
        if (!cancelled) setSuppliers([]);
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
      setMessage(error.message || "تعذر تحديث حالة المورد.");
    }
  }

  async function editCommission(supplier) {
    const nextValue = window.prompt("نسبة عمولة فلج", String(supplier.commissionRate ?? 0));
    if (nextValue === null) return;

    const commissionRate = Number(nextValue);
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      setMessage("نسبة العمولة يجب أن تكون بين 0 و 100.");
      return;
    }

    try {
      await updateSupplierCommission(supplier.id, commissionRate);
      setSuppliers((current) =>
        current.map((item) => (item.id === supplier.id ? { ...item, commissionRate } : item))
      );
      setMessage("تم تعديل نسبة العمولة.");
    } catch (error) {
      setMessage(error.message || "تعذر تعديل نسبة العمولة.");
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الإدارة</p>
          <h1>إدارة الموردين</h1>
        </div>
      </header>

      <section className="status-tabs" aria-label="تصفية الموردين">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className={activeStatus === status ? "active" : "ghost"}
            onClick={() => setActiveStatus(status)}
          >
            {status === "all" ? "الكل" : supplierStatusLabel(status)}
          </button>
        ))}
      </section>

      {message ? <p className="auth-alert success">{message}</p> : null}

      <section className="panel">
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
              {visibleSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.phone}</td>
                  <td>{supplier.email}</td>
                  <td>
                    <span className={`status ${supplier.status}`}>
                      {supplierStatusLabel(supplier.status)}
                    </span>
                  </td>
                  <td>{Number(supplier.commissionRate || 0).toFixed(2)}%</td>
                  <td>{formatDate(supplier.createdAt)}</td>
                  <td>
                    <div className="row-actions wide-actions">
                      <button type="button" onClick={() => onNavigate?.(`/admin/suppliers/${supplier.id}/account`)}>
                        عرض التفاصيل
                      </button>
                      <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "approved")}>
                        اعتماد
                      </button>
                      <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "rejected")}>
                        رفض
                      </button>
                      <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "suspended")}>
                        إيقاف
                      </button>
                      <button type="button" className="ghost" onClick={() => setStatus(supplier.id, "approved")}>
                        إعادة تفعيل
                      </button>
                      <button type="button" className="ghost" onClick={() => editCommission(supplier)}>
                        تعديل العمولة
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
