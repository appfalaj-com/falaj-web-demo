import { useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";

export default function DriverLoginPage({ onNavigate }) {
  const { direction, t } = useI18n();
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handlePasswordLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        throw loginError;
      }

      onNavigate?.("/driver");
    } catch (loginError) {
      setError(loginError?.message || t("login.driver.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/driver`,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setMessage(t("login.driver.linkSent"));
    } catch (otpError) {
      setError(otpError?.message || t("login.driver.linkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page" dir={direction}>
      <section className="login-panel">
        <LanguageToggle className="auth-language-toggle" />
        <div className="login-brand">
          <img src="/brand/Falaj_Icon.png" alt={t("common.appName")} />
          <div>
            <strong>{t("common.appName")}</strong>
            <small>{t("login.driver.brand")}</small>
          </div>
        </div>

        <div className="login-header">
          <h1>{t("login.driver.title")}</h1>
          <p>{t("login.driver.description")}</p>
        </div>

        <div className="login-tabs" role="tablist" aria-label={t("login.driver.title")}>
          <button
            type="button"
            className={mode === "password" ? "active" : undefined}
            onClick={() => setMode("password")}
          >
            {t("login.driver.passwordTab")}
          </button>
          <button
            type="button"
            className={mode === "link" ? "active" : undefined}
            onClick={() => setMode("link")}
          >
            {t("login.driver.linkTab")}
          </button>
        </div>

        {error && <div className="auth-alert error">{error}</div>}
        {message && <div className="auth-alert success">{message}</div>}

        <form className="auth-form" onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}>
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

          {mode === "password" && (
            <label>
              {t("common.password")}
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>
          )}

          <button type="submit" disabled={loading}>
            {loading ? t("common.processing") : mode === "password" ? t("login.driver.submit") : t("login.driver.sendLink")}
          </button>
        </form>
      </section>
    </main>
  );
}
