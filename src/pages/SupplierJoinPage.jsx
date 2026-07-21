import { useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";

const serviceOptions = [
  { value: "مياه شرب عبوات", labelKey: "supplierJoin.service.bottles" },
  { value: "صهاريج مياه", labelKey: "supplierJoin.service.tankers" },
  { value: "الاثنين", labelKey: "supplierJoin.service.both" },
];

const initialForm = {
  companyName: "",
  managerName: "",
  phone: "",
  email: "",
  area: "",
  serviceType: serviceOptions[0].value,
  notes: "",
};

export default function SupplierJoinPage({ onNavigate }) {
  const { direction, t } = useI18n();
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
      setErrorMessage(t("supplierJoin.noConnection"));
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const email = form.email.trim().toLowerCase();
      const requestId = crypto.randomUUID();
      const { error } = await supabase
        .from("supplier_join_requests")
        .insert({
          id: requestId,
          company_name: form.companyName,
          contact_name: form.managerName,
          phone: form.phone,
          email,
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
      setStatusMessage(t("supplierJoin.success"));
    } catch (error) {
      console.warn("Supplier join request failed:", error?.message || "Unexpected error");
      setErrorMessage(t("supplierJoin.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="supplier-join-page" dir={direction}>
      <header className="supplier-join-header">
        <button type="button" className="ghost" onClick={() => onNavigate?.("/")}>
          {t("common.backHome")}
        </button>
        <LanguageToggle />
        <div>
          <img className="supplier-join-logo" src="/brand/Falaj_Logo.png" alt={t("common.appName")} />
          <p className="landing-eyebrow">{t("supplierJoin.brand")}</p>
          <h1>{t("supplierJoin.title")}</h1>
          <p>{t("supplierJoin.description")}</p>
        </div>
      </header>

      <section className="supplier-join-form-card">
        <form className="supplier-join-form" onSubmit={handleSubmit}>
          {statusMessage ? <p className="auth-alert success supplier-join-message">{statusMessage}</p> : null}
          {errorMessage ? <p className="auth-alert error supplier-join-message">{errorMessage}</p> : null}

          <label>
            {t("supplierJoin.companyName")}
            <input
              required
              type="text"
              value={form.companyName}
              onChange={(event) => updateField("companyName", event.target.value)}
            />
          </label>

          <label>
            {t("supplierJoin.managerName")}
            <input
              required
              type="text"
              value={form.managerName}
              onChange={(event) => updateField("managerName", event.target.value)}
            />
          </label>

          <label>
            {t("supplierJoin.phone")}
            <input
              required
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </label>

          <label>
            {t("common.email")}
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>

          <label>
            {t("supplierJoin.area")}
            <input
              required
              type="text"
              value={form.area}
              onChange={(event) => updateField("area", event.target.value)}
            />
          </label>

          <label>
            {t("supplierJoin.serviceType")}
            <select
              value={form.serviceType}
              onChange={(event) => updateField("serviceType", event.target.value)}
            >
              {serviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="supplier-join-notes">
            {t("supplierJoin.notes")}
            <textarea
              rows="5"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </label>

          <button type="submit" className="supplier-join-submit" disabled={isSubmitting}>
            {isSubmitting ? t("supplierJoin.sending") : t("supplierJoin.submit")}
          </button>
        </form>
      </section>
    </main>
  );
}
