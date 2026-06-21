import { useState } from "react";

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

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const subject = "طلب انضمام مورد مياه - فلج";
    const body = [
      "طلب انضمام مورد مياه في فلج",
      "",
      `اسم الشركة: ${form.companyName}`,
      `اسم المسؤول: ${form.managerName}`,
      `رقم الهاتف: ${form.phone}`,
      `البريد الإلكتروني: ${form.email}`,
      `الولاية / المنطقة: ${form.area}`,
      `نوع الخدمة: ${form.serviceType}`,
      `ملاحظات إضافية: ${form.notes || "لا يوجد"}`,
    ].join("\n");

    window.location.href = `mailto:info@appfalaj.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <main className="supplier-join-page" dir="rtl">
      <header className="supplier-join-header">
        <button type="button" className="ghost" onClick={() => onNavigate?.("/")}>
          العودة للرئيسية
        </button>
        <div>
          <p className="landing-eyebrow">فلج للموردين</p>
          <h1>طلب انضمام مورد مياه</h1>
          <p>املأ بيانات شركتك، وسيفتح بريد إلكتروني جاهز لإرسال طلب الانضمام إلى فريق فلج.</p>
        </div>
      </header>

      <section className="supplier-join-form-card">
        <form className="supplier-join-form" onSubmit={handleSubmit}>
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

          <button type="submit" className="supplier-join-submit">
            إرسال طلب الانضمام
          </button>
        </form>
      </section>
    </main>
  );
}
