import { useMemo, useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";

export default function DriverAcceptInvitePage({ onNavigate }) {
  const { direction, t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const ticket = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ticket")?.trim() || "";
  }, []);

  async function handleSetPassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!ticket) {
      setError(t("driver.accept.invalidTicket"));
      return;
    }

    if (password.length < 8) {
      setError(t("password.short"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("password.mismatch"));
      return;
    }

    if (!supabase) {
      setError(t("driver.accept.connectionError"));
      return;
    }

    setLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("driver-accept-invite", {
        body: {
          ticket,
          password,
        },
      });

      if (invokeError || !data?.ok) {
        if (import.meta.env.DEV) {
          console.warn("driver_accept_invite_failed", {
            message: invokeError?.message || data?.error,
            status: invokeError?.status,
          });
        }
        setError(data?.error || t("driver.accept.genericError"));
        return;
      }

      await supabase.auth.signOut();
      setPassword("");
      setConfirmPassword("");
      setMessage("تم حفظ كلمة مرور السائق. يمكنه الآن الدخول من صفحة السائق بالبريد أو رقم الهاتف.");

      window.setTimeout(() => {
        onNavigate?.("/driver/login");
      }, 1400);
    } catch (acceptError) {
      if (import.meta.env.DEV) {
        console.warn("driver_accept_invite_unexpected", {
          message: acceptError?.message,
          code: acceptError?.code,
          status: acceptError?.status,
        });
      }
      setError(t("driver.accept.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page" dir={direction}>
      <section className="login-panel falaj-auth-card" aria-labelledby="driver-accept-invite-title">
        <LanguageToggle className="auth-language-toggle" />
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt={t("common.appName")} />
          <div>
            <strong>{t("common.appName")}</strong>
            <small>{t("driver.accept.brand")}</small>
          </div>
        </div>

        <header className="login-header">
          <p className="eyebrow">{t("driver.accept.eyebrow")}</p>
          <h1 id="driver-accept-invite-title">إعداد كلمة مرور السائق</h1>
          <p className="auth-note">
            أدخل كلمة مرور جديدة لحساب السائق. بعد الحفظ يمكن للسائق الدخول بالبريد أو رقم الهاتف وكلمة المرور.
          </p>
        </header>

        {message ? <p className="auth-alert success">{message}</p> : null}
        {error ? <p className="auth-alert error">{error}</p> : null}

        <form className="auth-form" onSubmit={handleSetPassword}>
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

          <button type="submit" className="auth-primary-button" disabled={loading || !ticket}>
            {loading ? "جاري حفظ كلمة المرور..." : "حفظ كلمة مرور السائق"}
          </button>
        </form>

        <button type="button" className="auth-text-button" onClick={() => onNavigate?.("/driver/login")}>
          {t("driver.accept.back")}
        </button>
      </section>
    </main>
  );
}
