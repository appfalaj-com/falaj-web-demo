import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function AccessDeniedPage({ message, onNavigate }) {
  const { direction, t } = useI18n();

  return (
    <main className="login-page" dir={direction}>
      <section className="login-panel">
        <LanguageToggle className="auth-language-toggle" />
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt={t("common.appName")} />
          <div>
            <strong>{t("common.appName")}</strong>
            <small>{t("accessDenied.brand")}</small>
          </div>
        </div>
        <p className="eyebrow">{t("accessDenied.title")}</p>
        <p className="auth-alert error">{message}</p>
        <button type="button" className="ghost" onClick={() => onNavigate?.("/")}>
          {t("common.backHome")}
        </button>
      </section>
    </main>
  );
}
