import { useI18n } from "../i18n/I18nProvider.jsx";

export default function EmptyState({ titleKey = "common.noData", textKey, action, className = "" }) {
  const { t } = useI18n();

  return (
    <div className={["empty-state falaj-empty-state", className].filter(Boolean).join(" ")}>
      <span className="empty-state-icon" aria-hidden="true">
        —
      </span>
      <strong>{t(titleKey)}</strong>
      {textKey ? <span>{t(textKey)}</span> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
