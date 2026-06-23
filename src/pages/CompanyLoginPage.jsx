import { useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import {
  signInCompanyWithEmail,
  sendCompanyPasswordReset,
} from "../services/companyAuthService.js";

export default function CompanyLoginPage({ onAuthenticated }) {
  const { direction, t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  async function handleEmailLogin(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      const authState = await signInCompanyWithEmail(email.trim(), password);
      onAuthenticated(authState);
    } catch (authError) {
      setError(t("login.company.emailError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset(event) {
    event.preventDefault();
    setError("");
    setStatus("");

    const targetEmail = (resetEmail || email).trim();
    if (!targetEmail) {
      setError(t("login.company.resetEmailRequired"));
      return;
    }

    setIsResetSubmitting(true);
    try {
      await sendCompanyPasswordReset(targetEmail);
      setResetEmail(targetEmail);
      setStatus(t("login.company.resetSent"));
    } catch (authError) {
      setError(t("login.company.resetError"));
    } finally {
      setIsResetSubmitting(false);
    }
  }

  return (
    <main className="login-page" dir={direction}>
      <section className="login-panel" aria-labelledby="company-login-title">
        <LanguageToggle className="auth-language-toggle" />
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt={t("common.appName")} />
          <div>
            <strong>{t("common.appName")}</strong>
            <small>{t("login.company.brand")}</small>
          </div>
        </div>

        <header className="login-header">
          <p className="eyebrow">{t("login.company.eyebrow")}</p>
          <h1 id="company-login-title">{t("login.company.title")}</h1>
        </header>

        {error ? <p className="auth-alert error">{error}</p> : null}
        {status ? <p className="auth-alert success">{status}</p> : null}

        <form className="auth-form" onSubmit={handleEmailLogin}>
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
          <button
            type="button"
            className="auth-text-button"
            onClick={() => {
              setShowPasswordReset((value) => !value);
              setResetEmail(email);
              setError("");
              setStatus("");
            }}
          >
            {t("login.company.forgotPassword")}
          </button>
        </form>

        {showPasswordReset ? (
          <form className="auth-form password-reset-form" onSubmit={handlePasswordReset}>
            <label>
              {t("common.email")}
              <input
                type="email"
                autoComplete="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                required
              />
            </label>
            <p className="auth-note">{t("login.company.resetNote")}</p>
            <button type="submit" disabled={isResetSubmitting}>
              {isResetSubmitting ? t("common.processing") : t("login.company.resetPassword")}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
