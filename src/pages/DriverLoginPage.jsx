import { useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";
import {
  assertAuthenticatedActiveDriver,
  resolveDriverLoginIdentifier,
} from "../services/driverService.js";

const DRIVER_LOGIN_ERRORS = {
  not_found: "رقم الهاتف غير مسجل كسائق.",
  inactive: "حساب السائق غير مفعل.",
  not_linked: "حساب السائق غير مربوط بحساب دخول صحيح.",
  invalid_role: "هذا الحساب غير مسجل كسائق.",
  invalid_password: "كلمة السر غير صحيحة.",
  generic: "تعذر تسجيل دخول السائق حاليًا. تحقق من البيانات وحاول مرة أخرى.",
};

export default function DriverLoginPage({ onNavigate }) {
  const { direction, t } = useI18n();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePasswordLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const login = await resolveDriverLoginIdentifier(identifier);
      if (login.status !== "ok" || !login.email) {
        setError(DRIVER_LOGIN_ERRORS[login.status] || DRIVER_LOGIN_ERRORS.generic);
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: login.email,
        password,
      });

      if (loginError) {
        setError(driverPasswordError(loginError));
        return;
      }

      try {
        await assertAuthenticatedActiveDriver();
      } catch (driverError) {
        await supabase.auth.signOut();
        setError(driverSafeLoginError(driverError));
        return;
      }

      onNavigate?.("/driver");
    } catch (loginError) {
      if (import.meta.env.DEV) {
        console.warn("driver_login_failed", {
          message: loginError?.message,
          code: loginError?.code,
          details: loginError?.details,
          hint: loginError?.hint,
        });
      }
      setError(DRIVER_LOGIN_ERRORS.generic);
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

function driverPasswordError(error) {
  const message = `${error?.message ?? ""}`.toLowerCase();
  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials") ||
    message.includes("password")
  ) {
    return DRIVER_LOGIN_ERRORS.invalid_password;
  }

  return DRIVER_LOGIN_ERRORS.generic;
}

function driverSafeLoginError(error) {
  const message = error?.message || "";
  if (message.includes("غير مفعل")) return DRIVER_LOGIN_ERRORS.inactive;
  if (message.includes("غير مربوط")) return DRIVER_LOGIN_ERRORS.not_linked;
  return DRIVER_LOGIN_ERRORS.generic;
}
