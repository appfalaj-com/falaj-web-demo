import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

const navLinks = [
  { labelKey: "landing.nav.home", href: "#top" },
  { labelKey: "landing.nav.how", href: "#how-it-works" },
  { labelKey: "landing.nav.suppliers", href: "#suppliers" },
  { labelKey: "landing.nav.contact", href: "#contact" },
];

const stepKeys = [
  ["landing.step1.title", "landing.step1.text"],
  ["landing.step2.title", "landing.step2.text"],
  ["landing.step3.title", "landing.step3.text"],
  ["landing.step4.title", "landing.step4.text"],
];

const services = [
  { titleKey: "landing.service.drinking", icon: "drop" },
  { titleKey: "landing.service.boxes", icon: "box" },
  { titleKey: "landing.service.tankers", icon: "truck" },
  { titleKey: "landing.service.scheduled", icon: "calendar" },
];

const supplierPoints = [
  "landing.supplierPoint.orders",
  "landing.supplierPoint.drivers",
  "landing.supplierPoint.commissions",
  "landing.supplierPoint.reports",
];

function goToHash(event, href) {
  event.preventDefault();
  document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Icon({ type }) {
  if (type === "truck") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M7 17h24v16H7z" />
        <path d="M31 22h7l4 5v6H31z" />
        <circle cx="16" cy="35" r="4" />
        <circle cx="36" cy="35" r="4" />
      </svg>
    );
  }

  if (type === "box") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M10 16l14-7 14 7-14 7z" />
        <path d="M10 16v16l14 7V23z" />
        <path d="M38 16v16l-14 7V23z" />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="9" y="12" width="30" height="28" rx="4" />
        <path d="M9 20h30M17 8v8M31 8v8M17 28h4M27 28h4M17 34h4M27 34h4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 6s13 14 13 24a13 13 0 0 1-26 0C11 20 24 6 24 6z" />
      <path d="M18 31c2 3 6 5 10 3" />
    </svg>
  );
}

export default function LandingPage({ onNavigate }) {
  const { direction, t } = useI18n();

  return (
    <main className="landing-page" dir={direction} id="top">
      <header className="landing-header">
        <a
          className="landing-logo"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate?.("/");
          }}
        >
          <img className="landing-logo-image" src="/brand/Falaj_Logo.png" alt={t("common.appName")} />
        </a>

        <nav className="landing-nav" aria-label={t("nav.main")}>
          {navLinks.map((link) => (
            <a href={link.href} key={link.href} onClick={(event) => goToHash(event, link.href)}>
              {t(link.labelKey)}
            </a>
          ))}
        </nav>

        <div className="landing-header-actions">
          <LanguageToggle />
          <button type="button" className="landing-header-cta" onClick={() => onNavigate?.("/company/login")}>
            {t("landing.headerCta")}
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow">{t("landing.eyebrow")}</p>
          <h1>{t("landing.title")}</h1>
          <p className="landing-description">
            {t("landing.description")}
          </p>
          <div className="landing-actions">
            <button type="button" onClick={() => onNavigate?.("/company/login")}>
              {t("landing.companyLogin")}
            </button>
            <button type="button" className="ghost" onClick={() => onNavigate?.("/admin")}>
              {t("landing.adminLogin")}
            </button>
            <button type="button" className="ghost" disabled>
              {t("landing.customerSoon")}
            </button>
          </div>
        </div>

        <div className="hero-illustration" aria-label={t("landing.title")}>
          <div className="route-line" />
          <div className="hero-drop one" />
          <div className="hero-drop two" />
          <div className="phone-mockup">
            <div className="phone-speaker" />
            <div className="phone-screen">
              <div className="phone-top">
                <span>{t("landing.customerAppText")}</span>
                <strong>{t("landing.title")}</strong>
              </div>
              <div className="product-chip">
                <Icon type="drop" />
                <div>
                  <strong>{t("landing.service.drinking")}</strong>
                  <span>{t("landing.servicesTitle")}</span>
                </div>
              </div>
              <div className="product-chip">
                <Icon type="truck" />
                <div>
                  <strong>{t("landing.service.scheduled")}</strong>
                  <span>{t("landing.step4.title")}</span>
                </div>
              </div>
              <div className="progress-track">
                <span />
              </div>
            </div>
          </div>
          <div className="floating-product card-a">
            <Icon type="box" />
            <strong>{t("landing.service.boxes")}</strong>
          </div>
          <div className="floating-product card-b">
            <Icon type="truck" />
            <strong>{t("landing.service.tankers")}</strong>
          </div>
        </div>
      </section>

      <section className="landing-section" id="how-it-works">
        <div className="landing-section-head">
          <p className="landing-eyebrow">{t("landing.howEyebrow")}</p>
          <h2>{t("landing.howTitle")}</h2>
        </div>
        <div className="steps-grid">
          {stepKeys.map(([titleKey, textKey], index) => (
            <article className="step-card" key={titleKey}>
              <span>{index + 1}</span>
              <h3>{t(titleKey)}</h3>
              <p>{t(textKey)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="landing-eyebrow">{t("landing.servicesEyebrow")}</p>
          <h2>{t("landing.servicesTitle")}</h2>
        </div>
        <div className="services-grid">
          {services.map((service) => (
            <article className="service-card" key={service.titleKey}>
              <span className="service-icon">
                <Icon type={service.icon} />
              </span>
              <h3>{t(service.titleKey)}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="supplier-band" id="suppliers">
        <div>
          <p className="landing-eyebrow">{t("landing.suppliersEyebrow")}</p>
          <h2>{t("landing.suppliersTitle")}</h2>
          <ul>
            {supplierPoints.map((point) => (
              <li key={point}>{t(point)}</li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={() => onNavigate?.("/company/login")}>
          {t("landing.companyLogin")}
        </button>
      </section>

      <section className="landing-section supplier-join-section">
        <div>
          <p className="landing-eyebrow">{t("landing.joinEyebrow")}</p>
          <h2>{t("landing.joinTitle")}</h2>
          <p>
            {t("landing.joinDescription")}
          </p>
        </div>

        <div className="supplier-benefits-grid">
          <article>
            <span>01</span>
            <strong>{t("landing.joinBenefit1")}</strong>
          </article>
          <article>
            <span>02</span>
            <strong>{t("landing.joinBenefit2")}</strong>
          </article>
          <article>
            <span>03</span>
            <strong>{t("landing.joinBenefit3")}</strong>
          </article>
        </div>

        <div className="supplier-join-actions">
          <button type="button" onClick={() => onNavigate?.("/supplier-join")}>
            {t("landing.joinCta")}
          </button>
        </div>
      </section>

      <section className="landing-section split-section">
        <article className="admin-card">
          <p className="landing-eyebrow">{t("login.admin.eyebrow")}</p>
          <h2>{t("landing.adminCardTitle")}</h2>
          <p>{t("landing.adminCardText")}</p>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/admin")}>
            {t("landing.adminLogin")}
          </button>
        </article>

        <article className="mobile-soon-card">
          <p className="landing-eyebrow">{t("landing.mobileSoon")}</p>
          <div className="soon-grid">
            <div>
              <strong>{t("landing.customerAppSoon")}</strong>
              <span>{t("landing.customerAppText")}</span>
            </div>
            <div>
              <strong>{t("landing.driverAppSoon")}</strong>
              <span>{t("landing.driverAppText")}</span>
            </div>
          </div>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/driver")}>
            {t("landing.driverLogin")}
          </button>
        </article>
      </section>

      <footer className="landing-footer" id="contact">
        <div>
          <img className="footer-logo-image" src="/brand/Falaj_Logo.png" alt={t("common.appName")} />
          <span>appfalaj.com</span>
          <span>info@appfalaj.com</span>
          <span>© Falaj</span>
        </div>
        <nav aria-label={t("nav.main")}>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/company/login")}>
            {t("landing.companyLogin")}
          </button>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/admin")}>
            {t("landing.adminLogin")}
          </button>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/driver")}>
            {t("landing.driverLogin")}
          </button>
        </nav>
      </footer>
    </main>
  );
}
