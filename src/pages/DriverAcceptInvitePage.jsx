import { useMemo, useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { clearExistingAuthSessionForLogin } from "../services/authSessionBoundary.js";

export default function DriverAcceptInvitePage({ onNavigate }) {
  const { direction, t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ticket = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ticket")?.trim() || "";
  }, []);

  async function handleStartPasswordSetup() {
    setError("");

    if (!ticket) {
      setError(t("driver.accept.invalidTicket"));
      return;
    }

    if (!supabase) {
      setError(t("driver.accept.connectionError"));
      return;
    }

    setLoading(true);

    try {
      await clearExistingAuthSessionForLogin();

      const { data, error: invokeError } = await supabase.functions.invoke("driver-accept-invite", {
        body: {
          ticket,
          redirect_to: `${window.location.origin}/driver/set-password`,
        },
      });

      if (invokeError || !data?.ok || !data?.redirect_to) {
        if (import.meta.env.DEV) {
          console.warn("driver_accept_invite_failed", {
            message: invokeError?.message || data?.error,
            status: invokeError?.status,
          });
        }
        setError(t("driver.accept.genericError"));
        return;
      }

      window.location.assign(data.redirect_to);
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
          <h1 id="driver-accept-invite-title">{t("driver.accept.title")}</h1>
          <p className="auth-note">
            {t("driver.accept.note")}
          </p>
        </header>

        {error ? <p className="auth-alert error">{error}</p> : null}

        <button
          type="button"
          className="auth-primary-button"
          disabled={loading || !ticket}
          onClick={handleStartPasswordSetup}
        >
          {loading ? t("driver.accept.loading") : t("driver.accept.start")}
        </button>

        <button type="button" className="auth-text-button" onClick={() => onNavigate?.("/driver/login")}>
          {t("driver.accept.back")}
        </button>
      </section>
    </main>
  );
}
