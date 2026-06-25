import { useEffect, useState } from "react";
import {
  createCompanyDriverInSupabase,
  DRIVER_COMPANY_ACCOUNT_CONFLICT_ERROR,
  DRIVER_COMPANY_PHONE_CONFLICT_ERROR,
  getDriversByCompanyFromSupabase,
  sendDriverInviteFromSupabase,
  updateCompanyDriverInSupabase,
} from "../services/driverService.js";

const initialDriverForm = {
  name: "",
  phone: "",
  email: "",
  isActive: true,
};

const DRIVERS_LOAD_ERROR = "تعذر تحميل السائقين من قاعدة البيانات. حاول التحديث مرة أخرى.";
const DRIVER_SAVE_ERROR = "تعذر حفظ بيانات السائق حاليًا. حاول مرة أخرى.";
const DRIVER_STATUS_ERROR = "تعذر تحديث حالة السائق حاليًا. حاول مرة أخرى.";
const DRIVER_INVITE_ERROR = "تعذر إرسال دعوة دخول السائق حاليًا. حاول مرة أخرى.";

export default function CompanyDriversPage({ companyId }) {
  const [companyDrivers, setCompanyDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [form, setForm] = useState(initialDriverForm);
  const [invitingDriverId, setInvitingDriverId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDrivers() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const supabaseDrivers = await getDriversByCompanyFromSupabase(companyId);
        if (!cancelled) setCompanyDrivers(supabaseDrivers);
      } catch (error) {
        if (!cancelled) {
          setCompanyDrivers([]);
          setErrorMessage(DRIVERS_LOAD_ERROR);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadDrivers();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  function openCreateForm() {
    setEditingDriverId(null);
    setForm(initialDriverForm);
    setMessage("");
    setErrorMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(driver) {
    setEditingDriverId(driver.id);
    setForm({
      name: driver.name || "",
      phone: driver.phone || "",
      email: driver.email || "",
      isActive: Boolean(driver.isActive),
    });
    setMessage("");
    setErrorMessage("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingDriverId(null);
    setForm(initialDriverForm);
    setIsFormOpen(false);
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveDriver(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!companyId) {
      setErrorMessage("تعذر تحديد الشركة الحالية.");
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage("يرجى إدخال اسم السائق.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingDriverId) {
        const updatedDriver = await updateCompanyDriverInSupabase(companyId, editingDriverId, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          isActive: form.isActive,
        });
        setCompanyDrivers((current) =>
          current.map((driver) => (driver.id === editingDriverId ? updatedDriver : driver))
        );
        setMessage("تم تحديث بيانات السائق.");
      } else {
        const createdDriver = await createCompanyDriverInSupabase(companyId, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
        });
        setCompanyDrivers((current) => [createdDriver, ...current]);
        setMessage("تم إضافة السائق. يمكن ربطه بحساب دخول لاحقًا.");
      }

      closeForm();
    } catch (error) {
      setErrorMessage(driverSafeErrorMessage(error, DRIVER_SAVE_ERROR));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleDriverActive(driver) {
    setMessage("");
    setErrorMessage("");
    setIsSaving(true);

    try {
      const updatedDriver = await updateCompanyDriverInSupabase(companyId, driver.id, {
        name: driver.name,
        phone: driver.phone || "",
        email: driver.email || "",
        isActive: !driver.isActive,
      });
      setCompanyDrivers((current) =>
        current.map((item) => (item.id === driver.id ? updatedDriver : item))
      );
      setMessage(updatedDriver.isActive ? "تم تفعيل السائق." : "تم إيقاف السائق.");
    } catch (error) {
      setErrorMessage(DRIVER_STATUS_ERROR);
    } finally {
      setIsSaving(false);
    }
  }

  async function sendDriverInvite(driver) {
    setMessage("");
    setErrorMessage("");

    if (!driver.id) {
      setErrorMessage("تعذر تحديد السائق لإرسال الدعوة.");
      return;
    }

    if (!isValidEmail(driver.email)) {
      setErrorMessage("يرجى إضافة بريد السائق قبل إرسال دعوة الدخول.");
      return;
    }

    setInvitingDriverId(driver.id);
    try {
      const result = await sendDriverInviteFromSupabase(driver.id);
      setMessage(result.message || "تم إرسال دعوة دخول السائق.");

      const refreshedDrivers = await getDriversByCompanyFromSupabase(companyId);
      setCompanyDrivers(refreshedDrivers);
    } catch (error) {
      setErrorMessage(driverSafeErrorMessage(error, DRIVER_INVITE_ERROR));
    } finally {
      setInvitingDriverId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الشركة</p>
          <h1>السائقون</h1>
          <p>إدارة سائقي الشركة من Supabase وتجهيز ربط حسابات الدخول لاحقًا.</p>
        </div>
        <button type="button" className="primary-action" onClick={isFormOpen ? closeForm : openCreateForm}>
          {isFormOpen ? "إغلاق النموذج" : "إضافة سائق"}
        </button>
      </header>

      {message ? <p className="auth-alert success">{message}</p> : null}
      {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}

      {isFormOpen ? (
        <section className="panel product-form-panel">
          <div className="panel-header">
            <div>
              <h2>{editingDriverId ? "تعديل السائق" : "إضافة سائق"}</h2>
              <p>يتم حفظ السائق أولًا، ثم يمكن إرسال دعوة دخول آمنة لربط السائق بحساب Auth عبر البريد.</p>
            </div>
          </div>

          <form className="product-form driver-form" onSubmit={handleSaveDriver}>
            <label>
              اسم السائق
              <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
            </label>

            <label>
              رقم الهاتف
              <input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
            </label>

            <label>
              بريد السائق
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                placeholder="driver@example.com"
              />
              <small className="form-hint">استخدم بريدًا مختلفًا عن بريد حساب الشركة. دخول الهاتف مؤجل حاليًا.</small>
            </label>

            <label className="product-form-check">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm("isActive", event.target.checked)}
                disabled={!editingDriverId}
              />
              نشط؟
            </label>

            <div className="product-form-actions">
              <button type="submit" className="primary-action" disabled={isSaving}>
                {isSaving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button type="button" className="ghost" onClick={closeForm} disabled={isSaving}>
                إلغاء
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="cards-grid">
        {isLoading ? (
          <p className="empty-state">جاري تحميل السائقين...</p>
        ) : companyDrivers.length === 0 ? (
          <div className="empty-state">
            <strong>لا يوجد سائقون حاليًا</strong>
            <span>ستظهر هنا بيانات السائقين بعد إضافتهم إلى حساب الشركة.</span>
            <button type="button" className="primary-action" onClick={openCreateForm}>
              إضافة أول سائق
            </button>
          </div>
        ) : (
          companyDrivers.map((driver) => (
            <article className="driver-card" key={driver.id}>
              <div className="driver-card-head">
                <div>
                  <h2>{driver.name}</h2>
                  <p>{driver.phone || "-"}</p>
                </div>
                <span className={`status ${driver.isActive ? "active" : "inactive"}`}>
                  {driver.isActive ? "نشط" : "موقوف"}
                </span>
              </div>

              <dl>
                <div>
                  <dt>حالة الاتصال</dt>
                  <dd>{driver.status}</dd>
                </div>
                <div>
                  <dt>حساب الدخول</dt>
                  <dd>
                    <span className={`status ${driver.profileId ? "approved" : "pending"}`}>
                      {driver.profileId ? "مربوط بحساب دخول" : "غير مربوط بحساب دخول"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>بريد الدخول</dt>
                  <dd>{driver.email || "-"}</dd>
                </div>
                <div>
                  <dt>Profile ID</dt>
                  <dd>{driver.profileId || "-"}</dd>
                </div>
                <div>
                  <dt>آخر تحديث</dt>
                  <dd>{formatDate(driver.updatedAt || driver.createdAt)}</dd>
                </div>
                <div>
                  <dt>تاريخ الإضافة</dt>
                  <dd>{formatDate(driver.createdAt)}</dd>
                </div>
              </dl>

              <div className="row-actions">
                <button type="button" onClick={() => openEditForm(driver)}>
                  تعديل
                </button>
                <button type="button" className="ghost" onClick={() => toggleDriverActive(driver)} disabled={isSaving}>
                  {driver.isActive ? "إيقاف" : "تفعيل"}
                </button>
                {isValidEmail(driver.email) ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => sendDriverInvite(driver)}
                    disabled={invitingDriverId === driver.id || !driver.id}
                  >
                    {invitingDriverId === driver.id
                      ? "جاري الإرسال..."
                      : driver.profileId
                        ? "إعادة إرسال رابط الدخول"
                        : "إرسال دعوة دخول"}
                  </button>
                ) : null}
                <button type="button" className="ghost" disabled title="الحذف غير متاح حاليًا">
                  الحذف غير متاح
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-OM");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function driverSafeErrorMessage(error, fallback) {
  const message = error?.message || "";
  if (
    message === DRIVER_COMPANY_ACCOUNT_CONFLICT_ERROR ||
    message === DRIVER_COMPANY_PHONE_CONFLICT_ERROR ||
    message.includes("هذا البريد مستخدم كحساب شركة")
  ) {
    return message;
  }

  return fallback;
}
