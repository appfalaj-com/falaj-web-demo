export default function SectionCard({ title, description, actions, children, className = "" }) {
  return (
    <section className={["section-card", className].filter(Boolean).join(" ")}>
      {(title || description || actions) ? (
        <div className="section-card-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="section-card-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
