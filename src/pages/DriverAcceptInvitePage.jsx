import { useMemo, useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { clearExistingAuthSessionForLogin } from "../services/authSessionBoundary.js";

const GENERIC_ERROR = "تعذر بدء إعداد كلمة المرور. اطلب رابطًا جديدًا من الشركة.";

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
      setError("رابط دعوة السائق غير صالح أو منتهي.");
      return;
    }

    if (!supabase) {
      setError("تعذر الاتصال بخدمة فلج حاليًا.");
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
        setError(data?.error || GENERIC_ERROR);
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
      setError(GENERIC_ERROR);
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
            <small>بوابة السائق</small>
          </div>
        </div>

        <header className="login-header">
          <p className="eyebrow">دعوة السائق</p>
          <h1 id="driver-accept-invite-title">إعداد حساب السائق</h1>
          <p className="auth-note">
            اضغط الزر أدناه لبدء إعداد كلمة المرور. لن يتم إنشاء رابط Supabase الآمن إلا بعد هذه الخطوة.
          </p>
        </header>

        {error ? <p className="auth-alert error">{error}</p> : null}

        <button
          type="button"
          className="auth-primary-button"
          disabled={loading || !ticket}
          onClick={handleStartPasswordSetup}
        >
          {loading ? "جاري تجهيز الرابط..." : "بدء إعداد كلمة المرور"}
        </button>

        <button type="button" className="auth-text-button" onClick={() => onNavigate?.("/driver/login")}>
          العودة لتسجيل دخول السائق
        </button>
      </section>
    </main>
  );
}
