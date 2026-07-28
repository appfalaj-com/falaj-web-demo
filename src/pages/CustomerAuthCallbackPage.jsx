import { useEffect, useMemo } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

function buildAppCallbackUrl() {
  const { search, hash } = window.location;
  return `falaj://auth/callback${search || ""}${hash || ""}`;
}

export default function CustomerAuthCallbackPage({ onNavigate }) {
  const { direction, t } = useI18n();
  const appCallbackUrl = useMemo(buildAppCallbackUrl, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.href = appCallbackUrl;
    }, 250);

    return () => window.clearTimeout(timer);
  }, [appCallbackUrl]);

  return (
    <main className="login-page" dir={direction}>
      <section className="login-panel falaj-auth-card customer-auth-callback-card">
        <LanguageToggle className="auth-language-toggle" />
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt={t("common.appName")} />
          <div>
            <strong>{t("common.appName")}</strong>
            <small>{t("landing.description")}</small>
          </div>
        </div>

        <p className="eyebrow">Customer Auth</p>
        <h1>جاري فتح تطبيق فلج</h1>
        <p className="auth-note">
          إذا لم يفتح التطبيق تلقائيًا، اضغط زر فتح التطبيق لإكمال تأكيد البريد أو تسجيل الدخول.
        </p>

        <div className="not-found-actions">
          <a className="falaj-button" href={appCallbackUrl}>
            فتح التطبيق
          </a>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/")}>
            العودة للرئيسية
          </button>
        </div>
      </section>
    </main>
  );
}
