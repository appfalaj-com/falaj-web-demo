import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function NotFoundPage({ onNavigate }) {
  const { direction, t } = useI18n();
  const goTo = (path) => {
    onNavigate?.(path);
  };

  return (
    <main className="login-page" dir={direction}>
      <section className="login-panel falaj-auth-card">
        <LanguageToggle className="auth-language-toggle" />
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt={t("common.appName")} />
          <div>
            <strong>{t("common.appName")}</strong>
            <small>{t("landing.description")}</small>
          </div>
        </div>

        <p className="eyebrow">404</p>
        <h1>{t("notFound.title")}</h1>
        <p className="auth-note">
          {t("notFound.text")}
        </p>

        <div className="not-found-actions">
          <button type="button" onClick={() => goTo("/")}>
            {t("common.backHome")}
          </button>
          <button type="button" className="ghost" onClick={() => goTo("/admin")}>
            {t("landing.adminLogin")}
          </button>
          <button type="button" className="ghost" onClick={() => goTo("/company/login")}>
            {t("landing.companyLogin")}
          </button>
        </div>
      </section>
    </main>
  );
}
