import { useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";

export default function CompanySetPasswordPage({ onSaved }) {
  const { direction, t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError(t("password.short"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("password.mismatch"));
      return;
    }

    if (!supabase) {
      setError(t("password.noConnection"));
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setPassword("");
      setConfirmPassword("");
      setMessage(t("password.success"));

      window.setTimeout(() => {
        onSaved?.();
      }, 900);
    } catch (updateError) {
      setError(t("password.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page" dir={direction}>
      <section className="login-panel falaj-auth-card" aria-labelledby="company-set-password-title">
        <LanguageToggle className="auth-language-toggle" />
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt={t("common.appName")} />
          <div>
            <strong>{t("common.appName")}</strong>
            <small>{t("password.brand")}</small>
          </div>
        </div>

        <header className="login-header">
          <p className="eyebrow">{t("login.company.eyebrow")}</p>
          <h1 id="company-set-password-title">{t("password.title")}</h1>
          <p className="auth-note">
            {t("password.note")}
          </p>
        </header>

        {message ? <p className="auth-alert success">{message}</p> : null}
        {error ? <p className="auth-alert error">{error}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            {t("common.newPassword")}
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <label>
            {t("common.confirmPassword")}
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <p className="auth-note">{t("password.rules")}</p>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("password.saving") : t("password.save")}
          </button>
        </form>
      </section>
    </main>
  );
}
