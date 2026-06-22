import { useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import {
  COMPANY_AUTH_ERRORS,
  sendCompanyEmailMagicLink,
  sendCompanyPhoneOtp,
  signInCompanyWithEmail,
  verifyCompanyPhoneOtp,
} from "../services/companyAuthService.js";

export default function CompanyLoginPage({ onAuthenticated }) {
  const { direction, t } = useI18n();
  const [activeTab, setActiveTab] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEmailLogin(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      const authState = await signInCompanyWithEmail(email.trim(), password);
      onAuthenticated(authState);
    } catch (authError) {
      setError(authError.message || t("login.company.emailError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendOtp(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      await sendCompanyPhoneOtp(phone.trim());
      setOtpSent(true);
      setStatus(t("login.company.otpSent"));
    } catch (authError) {
      setError(authError.message || COMPANY_AUTH_ERRORS.PHONE_DISABLED);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendEmailLink(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      await sendCompanyEmailMagicLink(linkEmail.trim());
      setStatus(t("login.company.linkSent"));
    } catch (authError) {
      setError(authError.message || t("login.company.linkError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      const authState = await verifyCompanyPhoneOtp(phone.trim(), otp.trim());
      onAuthenticated(authState);
    } catch (authError) {
      setError(authError.message || t("login.company.otpError"));
    } finally {
      setIsSubmitting(false);
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

        <div className="login-tabs" role="tablist" aria-label={t("login.company.title")}>
          <button
            type="button"
            className={activeTab === "email" ? "active" : ""}
            role="tab"
            aria-selected={activeTab === "email"}
            onClick={() => {
              setActiveTab("email");
              setError("");
              setStatus("");
            }}
          >
            {t("login.company.passwordTab")}
          </button>
          <button
            type="button"
            className={activeTab === "link" ? "active" : ""}
            role="tab"
            aria-selected={activeTab === "link"}
            onClick={() => {
              setActiveTab("link");
              setError("");
              setStatus("");
            }}
          >
            {t("login.company.linkTab")}
          </button>
          <button
            type="button"
            className={activeTab === "phone" ? "active" : ""}
            role="tab"
            aria-selected={activeTab === "phone"}
            onClick={() => {
              setActiveTab("phone");
              setError("");
              setStatus("");
            }}
          >
            {t("login.company.phoneTab")}
          </button>
        </div>

        {error ? <p className="auth-alert error">{error}</p> : null}
        {status ? <p className="auth-alert success">{status}</p> : null}

        {activeTab === "email" ? (
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
          </form>
        ) : activeTab === "link" ? (
          <form className="auth-form" onSubmit={handleSendEmailLink}>
            <label>
              {t("common.email")}
              <input
                type="email"
                autoComplete="email"
                value={linkEmail}
                onChange={(event) => setLinkEmail(event.target.value)}
                required
              />
            </label>
            <p className="auth-note">{t("login.company.linkNote")}</p>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("login.company.sendingLink") : t("login.company.sendLink")}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            <label>
              {t("login.company.phone")}
              <input
                type="tel"
                dir="ltr"
                autoComplete="tel"
                placeholder="+96890001111"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </label>
            {otpSent ? (
              <label>
                {t("login.company.otp")}
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  required
                />
              </label>
            ) : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.processing") : otpSent ? t("login.company.verifyOtp") : t("login.company.sendOtp")}
            </button>
            {otpSent ? (
              <button
                type="button"
                className="ghost"
                disabled={isSubmitting}
                onClick={() => {
                  setOtp("");
                  setOtpSent(false);
                  setStatus("");
                  setError("");
                }}
              >
                {t("login.company.changePhone")}
              </button>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}
