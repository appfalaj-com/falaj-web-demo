import { useMemo, useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { clearExistingAuthSessionForLogin } from "../services/authSessionBoundary.js";

const GENERIC_ERROR = "تعذر بدء إعادة تعيين كلمة المرور. اطلب رابطًا جديدًا من صفحة دخول المورد.";

export default function CompanyAcceptResetPage({ onNavigate }) {
  const { direction, t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ticket = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ticket")?.trim() || "";
  }, []);

  async function handleStartPasswordReset() {
    setError("");

    if (!ticket) {
      setError("رابط إعادة تعيين كلمة المرور غير صالح أو منتهي.");
      return;
    }

    if (!supabase) {
      setError("تعذر الاتصال بخدمة فلج حاليًا.");
      return;
    }

    setLoading(true);

    try {
      await clearExistingAuthSessionForLogin();

      const { data, error: invokeError } = await supabase.functions.invoke("company-accept-reset", {
        body: {
          ticket,
          redirect_to: `${window.location.origin}/company/set-password`,
        },
      });

      if (invokeError || !data?.ok || !data?.redirect_to) {
        if (import.meta.env.DEV) {
          console.warn("company_accept_reset_failed", {
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
        console.warn("company_accept_reset_unexpected", {
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
      <section className="login-panel falaj-auth-card" aria-labelledby="company-accept-reset-title">
        <LanguageToggle className="auth-language-toggle" />
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt={t("common.appName")} />
          <div>
            <strong>{t("common.appName")}</strong>
            <small>لوحة الموردين والشركات</small>
          </div>
        </div>

        <header className="login-header">
          <p className="eyebrow">إعادة تعيين كلمة المرور</p>
          <h1 id="company-accept-reset-title">إعداد كلمة مرور المورد</h1>
          <p className="auth-note">
            اضغط الزر أدناه لبدء إعادة تعيين كلمة المرور. لن يتم إنشاء رابط Supabase الآمن إلا بعد هذه الخطوة.
          </p>
        </header>

        {error ? <p className="auth-alert error">{error}</p> : null}

        <button
          type="button"
          className="auth-primary-button"
          disabled={loading || !ticket}
          onClick={handleStartPasswordReset}
        >
          {loading ? "جاري تجهيز الرابط..." : "بدء إعادة تعيين كلمة المرور"}
        </button>

        <button type="button" className="auth-text-button" onClick={() => onNavigate?.("/company/login")}>
          العودة لتسجيل دخول المورد
        </button>
      </section>
    </main>
  );
}
