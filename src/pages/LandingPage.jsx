import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

const content = {
  ar: {
    nav: [
      ["الرئيسية", "#top"],
      ["ما هو فلج؟", "#about"],
      ["التجربة", "#experience"],
      ["للموردين", "#suppliers"],
      ["الإطلاق", "#launch"],
    ],
    headerCta: "انضم كمورد",
    eyebrow: "منصة مياه رقمية تنطلق من عُمان",
    title: "فلج ينظّم طلب المياه",
    titleAccent: "من أقرب مورد حتى بابك",
    description:
      "بدل الاتصالات المتفرقة ورسائل الواتساب، فلج يجمع طلب مياه الشرب والكراتين والصهاريج في تجربة واحدة: مورد قريب، موقع واضح، وتتبّع لحالة التوصيل.",
    primaryCta: "انضم كمورد",
    secondaryCta: "شاهد التجربة",
    status: "تطبيق الزبون قريبًا",
    proof: ["طلبات منظمة", "تتبّع التوصيل", "لوحة للموردين"],
    phoneTitle: "طلب مياه جديد",
    phoneLocation: "الخوير، مسقط",
    phoneSupplier: "مورد قريب متاح",
    phoneProgress: ["تم الطلب", "قيد التجهيز", "في الطريق"],
    routeLabel: "مسار التوصيل",
    liveLabel: "توصيل مباشر",
    orderNumber: "الطلب #2481",
    deliveryEta: "الوصول خلال ٢٥ دقيقة",
    aboutEyebrow: "ما هو فلج؟",
    aboutTitle: "منصة تربط الزبائن بموردي المياه القريبين",
    aboutText:
      "فلج يحوّل طلب المياه من عملية يدوية إلى تجربة رقمية واضحة للزبون، ولوحة تشغيلية للموردين لإدارة الطلبات والسائقين والعمولات.",
    problemTitle: "المشكلة اليوم",
    problemText: "طلبات متفرقة، مواقع غير دقيقة، ومتابعة يدوية بين الزبون والمورد والسائق.",
    solutionTitle: "الحل مع فلج",
    solutionText: "طلب واحد، موقع واضح، مورد مناسب، وتحديثات حالة من لحظة الطلب حتى التسليم.",
    marketTitle: "لماذا الآن؟",
    marketText: "سوق المياه يعتمد على السرعة والثقة. فلج يعطي الموردين قناة رقمية جاهزة قبل إطلاق تطبيق الزبون.",
    experienceEyebrow: "تجربة الطلب",
    experienceTitle: "رحلة بسيطة بدل مكالمات متكررة",
    steps: [
      ["اختر نوع المياه", "عبوات، كراتين، أو صهريج حسب احتياجك."],
      ["حدد موقعك", "أدخل العنوان وتفاصيل الوصول بدقة."],
      ["تابع التوصيل", "اعرف حالة الطلب من التجهيز حتى الوصول."],
    ],
    services: ["مياه شرب", "كراتين مياه", "صهاريج مياه", "توصيل مجدول"],
    suppliersEyebrow: "للموردين",
    suppliersTitle: "افتح قناة بيع رقمية بدون فوضى تشغيلية",
    suppliersText:
      "لوحة الموردين تساعد شركة المياه على استقبال الطلبات، تنظيم المنتجات، متابعة السائقين، ومراجعة الأداء من مكان واحد.",
    supplierPoints: ["طلبات واضحة حسب المنطقة", "إدارة السائقين والتوصيل", "كتالوج منتجات وأسعار", "تقارير وعمولات"],
    joinCta: "أرسل طلب الانضمام",
    dashboardTitle: "لوحة المورد",
    dashboardRows: ["طلبات اليوم", "سائقون نشطون", "منتجات متاحة"],
    launchEyebrow: "حالة الإطلاق",
    launchTitle: "نبني شبكة الموردين أولًا، ثم نفتح تجربة الزبون",
    launchText:
      "نركّز الآن على ضم الموردين وتجهيز الكتالوج ومناطق التغطية، لنقدّم تجربة موثوقة للزبون من أول طلب.",
    launchItems: ["ضم الموردين الأوائل", "تجهيز الكتالوج والمناطق", "إطلاق تطبيق الزبون قريبًا"],
    faqTitle: "أسئلة سريعة",
    faqs: [
      ["هل التطبيق متاح للزبائن الآن؟", "تطبيق الزبون قريبًا. التركيز الحالي على ضم الموردين وتجهيز العمليات."],
      ["من يستفيد من فلج؟", "الزبائن يطلبون بسهولة، والموردون يستقبلون الطلبات ويديرون التوصيل من لوحة واحدة."],
      ["هل يوجد دخول للأدمن والسائق؟", "نعم، لكنها روابط تشغيلية وليست الدعوة الأساسية في الصفحة التسويقية."],
    ],
    contact: "info@appfalaj.com",
    supplierLogin: "دخول الموردين",
    adminLogin: "دخول الأدمن",
    driverLogin: "دخول السائق",
    footerTagline: "مياهك أقرب، وطلبك أوضح.",
  },
  en: {
    nav: [
      ["Home", "#top"],
      ["What is Falaj?", "#about"],
      ["Experience", "#experience"],
      ["For suppliers", "#suppliers"],
      ["Launch", "#launch"],
    ],
    headerCta: "Join as supplier",
    eyebrow: "A digital water platform starting in Oman",
    title: "Falaj organizes water orders",
    titleAccent: "from the nearest supplier to your door",
    description:
      "Instead of scattered calls and WhatsApp messages, Falaj brings drinking water, cartons, and tankers into one clear flow: nearby supplier, precise location, and delivery tracking.",
    primaryCta: "Join as supplier",
    secondaryCta: "See the experience",
    status: "Customer app coming soon",
    proof: ["Organized orders", "Delivery tracking", "Supplier dashboard"],
    phoneTitle: "New water order",
    phoneLocation: "Al Khuwair, Muscat",
    phoneSupplier: "Nearby supplier available",
    phoneProgress: ["Ordered", "Preparing", "On the way"],
    routeLabel: "Delivery route",
    liveLabel: "Live delivery",
    orderNumber: "Order #2481",
    deliveryEta: "Arriving in 25 minutes",
    aboutEyebrow: "What is Falaj?",
    aboutTitle: "A platform connecting customers with nearby water suppliers",
    aboutText:
      "Falaj turns water ordering from a manual process into a clear customer experience and an operations dashboard for suppliers.",
    problemTitle: "The problem today",
    problemText: "Scattered requests, unclear locations, and manual follow-up between customer, supplier, and driver.",
    solutionTitle: "The Falaj answer",
    solutionText: "One order, clear location, suitable supplier, and status updates from request to delivery.",
    marketTitle: "Why now?",
    marketText: "Water delivery runs on speed and trust. Falaj gives suppliers a digital channel before the customer app launch.",
    experienceEyebrow: "Ordering experience",
    experienceTitle: "A simple journey instead of repeated calls",
    steps: [
      ["Choose water type", "Bottles, cartons, or a tanker based on the need."],
      ["Set location", "Enter the address and delivery access details."],
      ["Track delivery", "Follow the order from preparation to arrival."],
    ],
    services: ["Drinking water", "Water cartons", "Water tankers", "Scheduled delivery"],
    suppliersEyebrow: "For suppliers",
    suppliersTitle: "Open a digital sales channel without operations clutter",
    suppliersText:
      "The supplier dashboard helps water companies receive orders, organize products, track drivers, and review performance in one place.",
    supplierPoints: ["Area-based orders", "Driver and delivery management", "Products and pricing catalog", "Reports and commissions"],
    joinCta: "Send join request",
    dashboardTitle: "Supplier dashboard",
    dashboardRows: ["Today's orders", "Active drivers", "Available products"],
    launchEyebrow: "Launch status",
    launchTitle: "We build the supplier network first, then open the customer experience",
    launchText:
      "We are onboarding suppliers and preparing the catalog and coverage areas to make every customer order reliable from day one.",
    launchItems: ["Onboard first suppliers", "Prepare catalog and areas", "Launch customer app soon"],
    faqTitle: "Quick questions",
    faqs: [
      ["Is the customer app live?", "The customer app is coming soon. The current focus is supplier onboarding and operations readiness."],
      ["Who benefits from Falaj?", "Customers order easily, and suppliers receive orders and manage delivery from one dashboard."],
      ["Are admin and driver logins available?", "Yes, but they are operational links, not the primary marketing action."],
    ],
    contact: "info@appfalaj.com",
    supplierLogin: "Supplier login",
    adminLogin: "Admin login",
    driverLogin: "Driver login",
    footerTagline: "Water closer. Ordering clearer.",
  },
};

function scrollToHash(event, href) {
  event.preventDefault();
  document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LandingPage({ onNavigate }) {
  const { direction, language, t } = useI18n();
  const copy = content[language] ?? content.ar;

  return (
    <main className="landing-page falaj-marketing" dir={direction} id="top">
      <header className="falaj-site-header">
        <a
          className="falaj-site-logo"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate?.("/");
          }}
        >
          <img src="/brand/Falaj_Logo.png" alt={t("common.appName")} />
        </a>

        <nav className="falaj-site-nav" aria-label={t("nav.main")}>
          {copy.nav.map(([label, href]) => (
            <a href={href} key={href} onClick={(event) => scrollToHash(event, href)}>
              {label}
            </a>
          ))}
        </nav>

        <div className="falaj-site-actions">
          <LanguageToggle />
          <button type="button" onClick={() => onNavigate?.("/supplier-join")}>
            {copy.headerCta}
          </button>
        </div>
      </header>

      <section className="falaj-hero">
        <div className="falaj-hero-copy">
          <p className="falaj-eyebrow">
            <span className="falaj-eyebrow-dot" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h1>
            {copy.title}
            <span>{copy.titleAccent}</span>
          </h1>
          <p className="falaj-lead">{copy.description}</p>

          <div className="falaj-hero-actions">
            <button type="button" onClick={() => onNavigate?.("/supplier-join")}>
              {copy.primaryCta}
              <span aria-hidden="true">←</span>
            </button>
            <a href="#experience" onClick={(event) => scrollToHash(event, "#experience")}>
              {copy.secondaryCta}
              <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="falaj-proof-strip" aria-label={copy.status}>
            <strong>
              <i aria-hidden="true" />
              {copy.status}
            </strong>
            {copy.proof.map((item) => (
              <span key={item}>
                <i aria-hidden="true">✓</i>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="falaj-hero-visual" aria-label={copy.phoneTitle}>
          <div className="falaj-visual-aura" aria-hidden="true" />
          <div className="falaj-route-card">
            <header>
              <span>{copy.routeLabel}</span>
              <strong>
                <i aria-hidden="true" />
                {copy.liveLabel}
              </strong>
            </header>
            <div className="falaj-route-map">
              <i className="route-node supplier" />
              <i className="route-node customer" />
              <i className="route-truck" />
            </div>
            <footer>
              <span>{copy.phoneLocation}</span>
              <strong>25 min</strong>
            </footer>
          </div>

          <div className="falaj-phone-3d">
            <div className="falaj-phone-glass">
              <div className="falaj-phone-topbar">
                <span>9:41</span>
                <i className="falaj-phone-bar" />
                <span>•••</span>
              </div>
              <div className="falaj-phone-appbar">
                <span>
                  <img src="/brand/Falaj_Icon.png" alt="" />
                  <strong>Falaj</strong>
                </span>
                <i aria-hidden="true">⌁</i>
              </div>
              <section className="falaj-order-panel">
                <div>
                  <span>{copy.orderNumber}</span>
                  <strong>{copy.liveLabel}</strong>
                </div>
                <h2>{copy.phoneTitle}</h2>
                <p>{copy.phoneSupplier}</p>
              </section>
              <div className="falaj-status-stack">
                {copy.phoneProgress.map((item, index) => (
                  <div className={`falaj-status-row ${index < 2 ? "is-complete" : "is-current"}`} key={item}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{item}</strong>
                      {index === 2 && <small>{copy.deliveryEta}</small>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="falaj-phone-location">
                <i aria-hidden="true" />
                <span>{copy.phoneLocation}</span>
              </div>
            </div>
          </div>

          <div className="falaj-floating-order order-one">
            <span>
              <small>24</small>
              <i aria-hidden="true">↗</i>
            </span>
            <strong>{copy.services[1]}</strong>
          </div>
          <div className="falaj-floating-order order-two">
            <span>
              <small>8T</small>
              <i aria-hidden="true">↗</i>
            </span>
            <strong>{copy.services[2]}</strong>
          </div>
        </div>
      </section>

      <section className="falaj-about" id="about">
        <div className="falaj-section-intro">
          <div>
            <p className="falaj-eyebrow">{copy.aboutEyebrow}</p>
            <span aria-hidden="true">01</span>
          </div>
          <h2>{copy.aboutTitle}</h2>
          <p>{copy.aboutText}</p>
        </div>
        <div className="falaj-insight-grid">
          {[
            [copy.problemTitle, copy.problemText],
            [copy.solutionTitle, copy.solutionText],
            [copy.marketTitle, copy.marketText],
          ].map(([title, text], index) => (
            <article key={title}>
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <i aria-hidden="true">{["⌁", "✓", "↗"][index]}</i>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="falaj-experience" id="experience">
        <div className="falaj-section-intro compact">
          <div>
            <p className="falaj-eyebrow">{copy.experienceEyebrow}</p>
            <span aria-hidden="true">02</span>
          </div>
          <h2>{copy.experienceTitle}</h2>
        </div>

        <div className="falaj-flow">
          {copy.steps.map(([title, text], index) => (
            <article className="falaj-flow-step" key={title}>
              <span>
                <i aria-hidden="true">{["◌", "⌖", "↗"][index]}</i>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>

        <div className="falaj-service-rail">
          {copy.services.map((service, index) => (
            <span key={service}>
              <i aria-hidden="true">{["◉", "▦", "▰", "◷"][index]}</i>
              {service}
            </span>
          ))}
        </div>
      </section>

      <section className="falaj-supplier-section" id="suppliers">
        <div className="falaj-supplier-copy">
          <div className="falaj-section-kicker">
            <p className="falaj-eyebrow">{copy.suppliersEyebrow}</p>
            <span aria-hidden="true">03</span>
          </div>
          <h2>{copy.suppliersTitle}</h2>
          <p>{copy.suppliersText}</p>
          <ul>
            {copy.supplierPoints.map((point) => (
              <li key={point}>
                <i aria-hidden="true">✓</i>
                {point}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onNavigate?.("/supplier-join")}>
            {copy.joinCta}
            <span aria-hidden="true">←</span>
          </button>
        </div>

        <div className="falaj-dashboard-preview" aria-label={copy.dashboardTitle}>
          <aside aria-hidden="true">
            <img src="/brand/Falaj_Icon.png" alt="" />
            <i />
            <i />
            <i />
            <i />
          </aside>
          <div className="falaj-dashboard-main">
            <header>
              <div>
                <span>{copy.dashboardTitle}</span>
                <strong>Falaj Ops</strong>
              </div>
              <i aria-hidden="true" />
            </header>
            <div className="falaj-dashboard-metrics">
              {copy.dashboardRows.map((row, index) => (
                <div className="falaj-dashboard-row" key={row}>
                  <span>{row}</span>
                  <strong>{[18, 6, 42][index]}</strong>
                  <small>{["+12%", "Live", "+8%"][index]}</small>
                </div>
              ))}
            </div>
            <div className="falaj-dashboard-chart">
              <header>
                <strong>{copy.dashboardRows[0]}</strong>
                <span>7D</span>
              </header>
              <div>
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="falaj-launch" id="launch">
        <div className="falaj-launch-copy">
          <div className="falaj-section-kicker">
            <p className="falaj-eyebrow">{copy.launchEyebrow}</p>
            <span aria-hidden="true">04</span>
          </div>
          <h2>{copy.launchTitle}</h2>
          <p>{copy.launchText}</p>
        </div>
        <ol>
          {copy.launchItems.map((item, index) => (
            <li key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
              <i aria-hidden="true">{index < 2 ? "✓" : "◌"}</i>
            </li>
          ))}
        </ol>
      </section>

      <section className="falaj-faq">
        <div className="falaj-faq-heading">
          <p className="falaj-eyebrow">FAQ</p>
          <h2>{copy.faqTitle}</h2>
        </div>
        <div>
          {copy.faqs.map(([question, answer], index) => (
            <details key={question} open={index === 0}>
              <summary>
                <span>{question}</span>
                <i aria-hidden="true">+</i>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="falaj-footer" id="contact">
        <div className="falaj-footer-brand">
          <img src="/brand/Falaj_Logo.png" alt={t("common.appName")} />
          <p>{copy.footerTagline}</p>
        </div>
        <div className="falaj-footer-content">
          <div className="falaj-footer-contact">
            <a href={`mailto:${copy.contact}`}>{copy.contact}</a>
            <span>appfalaj.com</span>
          </div>
          <nav aria-label={t("nav.main")}>
            <button type="button" className="ghost" onClick={() => onNavigate?.("/company/login")}>
              {copy.supplierLogin}
            </button>
            <button type="button" className="ghost" onClick={() => onNavigate?.("/admin")}>
              {copy.adminLogin}
            </button>
            <button type="button" className="ghost" onClick={() => onNavigate?.("/driver")}>
              {copy.driverLogin}
            </button>
          </nav>
        </div>
        <div className="falaj-footer-bottom">
          <span>© 2026 Falaj</span>
          <span>Made in Oman · صُنع في عُمان</span>
        </div>
      </footer>
    </main>
  );
}
