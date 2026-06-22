import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const initialForm = {
  companyName: "",
  managerName: "",
  phone: "",
  email: "",
  area: "",
  serviceType: "مياه شرب عبوات",
  notes: "",
};

export default function SupplierJoinPage({ onNavigate }) {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!supabase) {
      setStatusMessage("");
      setErrorMessage("تعذر الاتصال بقاعدة البيانات حاليًا. يرجى المحاولة لاحقًا.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const requestId = crypto.randomUUID();
      const { error } = await supabase
        .from("supplier_join_requests")
        .insert({
          id: requestId,
          company_name: form.companyName,
          contact_name: form.managerName,
          phone: form.phone,
          email: form.email,
          area: form.area,
          service_type: form.serviceType,
          notes: form.notes || null,
        });

      if (error) {
        throw error;
      }

      const { error: notifyError } = await supabase.functions.invoke("notify-supplier-join-request", {
        body: { request_id: requestId },
      });

      if (notifyError) {
        console.warn("Supplier join notification failed:", notifyError.message);
      }

      setForm(initialForm);
      setStatusMessage("تم إرسال طلب الانضمام بنجاح. سيقوم فريق فلج بمراجعة البيانات والتواصل معكم.");
    } catch (error) {
      setErrorMessage(error.message || "تعذر إرسال طلب الانضمام حاليًا. يرجى المحاولة لاحقًا.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="supplier-join-page" dir="rtl">
      <header className="supplier-join-header">
        <button type="button" className="ghost" onClick={() => onNavigate?.("/")}>
          العودة للرئيسية
        </button>
        <div>
          <img className="supplier-join-logo" src="/brand/Falaj_Logo.png" alt="Falaj" />
          <p className="landing-eyebrow">فلج للموردين</p>
          <h1>طلب انضمام مورد مياه</h1>
          <p>املأ بيانات شركتك، وسيفتح بريد إلكتروني جاهز لإرسال طلب الانضمام إلى فريق فلج.</p>
        </div>
      </header>

      <section className="supplier-join-form-card">
        <form className="supplier-join-form" onSubmit={handleSubmit}>
          {statusMessage ? <p className="auth-alert success supplier-join-message">{statusMessage}</p> : null}
          {errorMessage ? <p className="auth-alert error supplier-join-message">{errorMessage}</p> : null}

          <label>
            اسم الشركة
            <input
              required
              type="text"
              value={form.companyName}
              onChange={(event) => updateField("companyName", event.target.value)}
            />
          </label>

          <label>
            اسم المسؤول
            <input
              required
              type="text"
              value={form.managerName}
              onChange={(event) => updateField("managerName", event.target.value)}
            />
          </label>

          <label>
            رقم الهاتف
            <input
              required
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </label>

          <label>
            البريد الإلكتروني
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>

          <label>
            الولاية / المنطقة
            <input
              required
              type="text"
              value={form.area}
              onChange={(event) => updateField("area", event.target.value)}
            />
          </label>

          <label>
            نوع الخدمة
            <select
              value={form.serviceType}
              onChange={(event) => updateField("serviceType", event.target.value)}
            >
              <option>مياه شرب عبوات</option>
              <option>صهاريج مياه</option>
              <option>الاثنين</option>
            </select>
          </label>

          <label className="supplier-join-notes">
            ملاحظات إضافية
            <textarea
              rows="5"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </label>

          <button type="submit" className="supplier-join-submit" disabled={isSubmitting}>
            {isSubmitting ? "جاري إرسال الطلب..." : "إرسال طلب الانضمام"}
          </button>
        </form>
      </section>
    </main>
  );
}
