import { useI18n } from "../i18n/I18nProvider.jsx";

export default function PageHeader({ eyebrowKey, titleKey, subtitleKey, actions, children, className = "" }) {
  const { t } = useI18n();

  return (
    <header className={["page-header falaj-page-header", className].filter(Boolean).join(" ")}>
      <div className="page-header-copy">
        {eyebrowKey ? <p className="eyebrow">{t(eyebrowKey)}</p> : null}
        {titleKey ? <h1>{t(titleKey)}</h1> : null}
        {subtitleKey ? <p className="content-subtitle">{t(subtitleKey)}</p> : null}
        {children}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
