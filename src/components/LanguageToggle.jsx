import { useI18n } from "../i18n/I18nProvider.jsx";

export default function LanguageToggle({ className = "" }) {
  const { language, t, toggleLanguage } = useI18n();

  return (
    <button
      type="button"
      className={["language-toggle", className].filter(Boolean).join(" ")}
      onClick={toggleLanguage}
      aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      {t("common.languageSwitch")}
    </button>
  );
}
