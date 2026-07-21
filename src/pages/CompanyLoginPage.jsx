import { useEffect, useState } from "react";
import { Building2, KeyRound, LogIn, Mail, RotateCcw } from "lucide-react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { clearExistingAuthSessionForLogin } from "../services/authSessionBoundary.js";
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

  useEffect(() => {
    clearExistingAuthSessionForLogin();
  }, []);

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
    <div className="falaj-driver-app falaj-driver-login-app falaj-company-login-app" dir={direction}>
      <header className="falaj-driver-bar falaj-driver-login-bar">
        <a className="falaj-driver-brand" href="/" aria-label="Falaj">
          <img src="/brand/Falaj_Icon.png" alt="" />
          <span>
            <strong>Falaj</strong>
            <small>{t("login.company.brand")}</small>
          </span>
        </a>
        <LanguageToggle className="falaj-driver-language" />
      </header>

      <main className="falaj-driver-login-main">
        <section
          className="falaj-driver-login-card falaj-company-login-card"
          aria-labelledby="company-login-title"
        >
          <div className="falaj-driver-login-intro">
            <span className="falaj-driver-login-symbol" aria-hidden="true">
              <Building2 size={25} />
            </span>
            <div>
              <p>{t("login.company.eyebrow")}</p>
              <h1 id="company-login-title">{t("login.company.title")}</h1>
              <span>{t("login.company.brand")}</span>
            </div>
          </div>

          {error ? <div className="falaj-driver-alert error" role="alert">{error}</div> : null}
          {status ? <div className="falaj-driver-alert success" role="status">{status}</div> : null}

          <form className="falaj-driver-login-form" onSubmit={handleEmailLogin}>
            <label>
              <span>{t("common.email")}</span>
              <div className="falaj-driver-login-input">
                <Mail size={19} aria-hidden="true" />
                <input
                  type="email"
                  autoComplete="email"
                  dir="ltr"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>
            <label>
              <span>{t("common.password")}</span>
              <div className="falaj-driver-login-input">
                <KeyRound size={19} aria-hidden="true" />
                <input
                  type="password"
                  autoComplete="current-password"
                  dir="ltr"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </label>
            <button type="submit" disabled={isSubmitting}>
              <LogIn size={19} aria-hidden="true" />
              {isSubmitting ? t("login.signingIn") : t("common.login")}
            </button>
            <button
              type="button"
              className="falaj-company-forgot-button"
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
            <form className="falaj-driver-login-form falaj-company-reset-form" onSubmit={handlePasswordReset}>
              <label>
                <span>{t("common.email")}</span>
                <div className="falaj-driver-login-input">
                  <Mail size={19} aria-hidden="true" />
                  <input
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    required
                  />
                </div>
              </label>
              <p>{t("login.company.resetNote")}</p>
              <button type="submit" disabled={isResetSubmitting}>
                <RotateCcw size={18} aria-hidden="true" />
                {isResetSubmitting ? t("common.processing") : t("login.company.resetPassword")}
              </button>
            </form>
          ) : null}
        </section>
      </main>
    </div>
  );
}
