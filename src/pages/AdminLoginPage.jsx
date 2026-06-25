import { useEffect, useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { clearExistingAuthSessionForLogin } from "../services/authSessionBoundary.js";
import { signInAdminWithEmail } from "../services/companyAuthService.js";

export default function AdminLoginPage({ onAuthenticated }) {
  const { direction, t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    clearExistingAuthSessionForLogin();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const authState = await signInAdminWithEmail(email.trim(), password);
      onAuthenticated(authState);
    } catch (authError) {
      setError(authError.message || t("login.admin.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page" dir={direction}>
      <section className="login-panel" aria-labelledby="admin-login-title">
        <LanguageToggle className="auth-language-toggle" />
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt={t("common.appName")} />
          <div>
            <strong>{t("common.appName")}</strong>
            <small>{t("login.admin.brand")}</small>
          </div>
        </div>

        <header className="login-header">
          <p className="eyebrow">{t("login.admin.eyebrow")}</p>
          <h1 id="admin-login-title">{t("login.admin.title")}</h1>
        </header>

        {error ? <p className="auth-alert error">{error}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            {t("common.email")}
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            {t("common.password")}
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("login.signingIn") : t("common.login")}
          </button>
        </form>
      </section>
    </main>
  );
}
