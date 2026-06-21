const navLinks = [
  { label: "الرئيسية", href: "#top" },
  { label: "كيف يعمل", href: "#how-it-works" },
  { label: "للموردين", href: "#suppliers" },
  { label: "تواصل معنا", href: "#contact" },
];

const steps = [
  { title: "اختر المورد", text: "ابحث عن مورد قريب يناسب منطقتك." },
  { title: "اختر نوع المياه", text: "عبوات، كراتين، أو صهريج حسب احتياجك." },
  { title: "حدد الموقع", text: "أدخل عنوان التوصيل وتفاصيل الوصول." },
  { title: "تابع الطلب", text: "تابع حالة الطلب حتى يصل إلى بابك." },
];

const services = [
  { title: "مياه شرب", icon: "drop" },
  { title: "كراتين مياه", icon: "box" },
  { title: "صهاريج مياه", icon: "truck" },
  { title: "توصيل مجدول", icon: "calendar" },
];

const supplierPoints = ["إدارة الطلبات", "متابعة السائقين", "حساب العمولات", "تقارير مالية"];

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
  return (
    <main className="landing-page" dir="rtl" id="top">
      <header className="landing-header">
        <a
          className="landing-logo"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate?.("/");
          }}
        >
          <span className="landing-logo-mark">ف</span>
          <span>فلج</span>
        </a>

        <nav className="landing-nav" aria-label="روابط الصفحة">
          {navLinks.map((link) => (
            <a href={link.href} key={link.href} onClick={(event) => goToHash(event, link.href)}>
              {link.label}
            </a>
          ))}
        </nav>

        <button type="button" className="landing-header-cta" onClick={() => onNavigate?.("/company/login")}>
          دخول الموردين
        </button>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow">منصة مياه رقمية في عُمان</p>
          <h1>مياهك توصلك أينما كنت</h1>
          <p className="landing-description">
            فلج منصة رقمية لطلب مياه الشرب والعبوات والصهاريج من الموردين القريبين منك بسهولة وسرعة.
          </p>
          <div className="landing-actions">
            <button type="button" onClick={() => onNavigate?.("/company/login")}>
              دخول الموردين
            </button>
            <button type="button" className="ghost" onClick={() => onNavigate?.("/admin")}>
              دخول الأدمن
            </button>
            <button type="button" className="ghost" disabled>
              تطبيق الزبون قريبًا
            </button>
          </div>
        </div>

        <div className="hero-illustration" aria-label="تصور مبسط لتطبيق فلج">
          <div className="route-line" />
          <div className="hero-drop one" />
          <div className="hero-drop two" />
          <div className="phone-mockup">
            <div className="phone-speaker" />
            <div className="phone-screen">
              <div className="phone-top">
                <span>واجهة طلب سهلة</span>
                <strong>مياه قريبة منك</strong>
              </div>
              <div className="product-chip">
                <Icon type="drop" />
                <div>
                  <strong>مياه شرب</strong>
                  <span>خيارات متعددة</span>
                </div>
              </div>
              <div className="product-chip">
                <Icon type="truck" />
                <div>
                  <strong>توصيل مرن</strong>
                  <span>متابعة حالة الطلب</span>
                </div>
              </div>
              <div className="progress-track">
                <span />
              </div>
            </div>
          </div>
          <div className="floating-product card-a">
            <Icon type="box" />
            <strong>كراتين مياه</strong>
          </div>
          <div className="floating-product card-b">
            <Icon type="truck" />
            <strong>صهريج قريب</strong>
          </div>
        </div>
      </section>

      <section className="landing-section" id="how-it-works">
        <div className="landing-section-head">
          <p className="landing-eyebrow">كيف يعمل فلج؟</p>
          <h2>أربع خطوات مختصرة لطلب المياه</h2>
        </div>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <article className="step-card" key={step.title}>
              <span>{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="landing-eyebrow">خدماتنا</p>
          <h2>كل احتياجات المياه في مكان واحد</h2>
        </div>
        <div className="services-grid">
          {services.map((service) => (
            <article className="service-card" key={service.title}>
              <span className="service-icon">
                <Icon type={service.icon} />
              </span>
              <h3>{service.title}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="supplier-band" id="suppliers">
        <div>
          <p className="landing-eyebrow">للموردين</p>
          <h2>وسّع مبيعاتك واستقبل الطلبات من لوحة واحدة</h2>
          <ul>
            {supplierPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={() => onNavigate?.("/company/login")}>
          دخول الموردين
        </button>
      </section>

      <section className="landing-section supplier-join-section">
        <div>
          <p className="landing-eyebrow">انضم إلى شبكة فلج</p>
          <h2>انضم كمورد مياه في فلج</h2>
          <p>
            افتح قناة بيع رقمية جديدة لشركتك، واستقبل طلبات المياه من العملاء القريبين منك عبر منصة واحدة.
          </p>
        </div>

        <div className="supplier-benefits-grid">
          <article>
            <span>01</span>
            <strong>استقبال طلبات أكثر</strong>
          </article>
          <article>
            <span>02</span>
            <strong>إدارة التوصيل بسهولة</strong>
          </article>
          <article>
            <span>03</span>
            <strong>الظهور للعملاء في منطقتك</strong>
          </article>
        </div>

        <div className="supplier-join-actions">
          <a className="falaj-button" href="https://wa.me/968XXXXXXXX" target="_blank" rel="noreferrer">
            تواصل معنا للانضمام
          </a>
          <a className="falaj-button ghost-link" href="mailto:info@appfalaj.com">
            info@appfalaj.com
          </a>
        </div>
      </section>

      <section className="landing-section split-section">
        <article className="admin-card">
          <p className="landing-eyebrow">للإدارة</p>
          <h2>لوحة تحكم مركزية</h2>
          <p>إدارة الموردين، الطلبات، السائقين، العمولات والتسويات من لوحة تحكم مركزية.</p>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/admin")}>
            دخول الأدمن
          </button>
        </article>

        <article className="mobile-soon-card">
          <p className="landing-eyebrow">قريبًا على الجوال</p>
          <div className="soon-grid">
            <div>
              <strong>تطبيق الزبون قريبًا</strong>
              <span>طلب المياه وتتبع التوصيل.</span>
            </div>
            <div>
              <strong>تطبيق السائق قريبًا</strong>
              <span>استلام الطلبات وتحديث الحالات.</span>
            </div>
          </div>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/driver")}>
            دخول السائق
          </button>
        </article>
      </section>

      <footer className="landing-footer" id="contact">
        <div>
          <strong>Falaj</strong>
          <span>appfalaj.com</span>
          <span>info@appfalaj.com</span>
          <span>© Falaj</span>
        </div>
        <nav aria-label="روابط دخول فلج">
          <button type="button" className="ghost" onClick={() => onNavigate?.("/company/login")}>
            دخول الموردين
          </button>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/admin")}>
            دخول الأدمن
          </button>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/driver")}>
            دخول السائق
          </button>
        </nav>
      </footer>
    </main>
  );
}
