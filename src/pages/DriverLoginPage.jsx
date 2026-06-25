import { useEffect, useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { clearExistingAuthSessionForLogin } from "../services/authSessionBoundary.js";
import {
  assertAuthenticatedActiveDriver,
  signInDriverWithIdentifier,
} from "../services/driverService.js";

const DRIVER_LOGIN_ERROR = "بيانات تسجيل الدخول غير صحيحة.";

export default function DriverLoginPage({ onNavigate }) {
  const { direction, t } = useI18n();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    clearExistingAuthSessionForLogin();
  }, []);

  async function handlePasswordLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      await signInDriverWithIdentifier(identifier, password);

      try {
        await assertAuthenticatedActiveDriver();
      } catch (driverError) {
        await supabase.auth.signOut();
        if (import.meta.env.DEV) {
          console.warn("driver_login_role_check_failed", {
            message: driverError?.message,
            code: driverError?.code,
          });
        }
        setError(DRIVER_LOGIN_ERROR);
        return;
      }

      onNavigate?.("/driver");
    } catch (loginError) {
      if (import.meta.env.DEV) {
        console.warn("driver_login_failed", {
          message: loginError?.message,
          code: loginError?.code,
          status: loginError?.status,
        });
      }
      setError(DRIVER_LOGIN_ERROR);
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
          <p>ادخل برقم الهاتف أو البريد الإلكتروني المرتبط بحساب السائق.</p>
        </div>

        {error && <div className="auth-alert error">{error}</div>}

        <form className="auth-form" onSubmit={handlePasswordLogin}>
          <label>
            البريد الإلكتروني أو رقم الهاتف
            <input
              type="text"
              autoComplete="username"
              inputMode="email"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
              placeholder="driver@example.com أو 9xxxxxxx"
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
              minLength={8}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? t("common.processing") : t("login.driver.submit")}
          </button>
        </form>
      </section>
    </main>
  );
}
