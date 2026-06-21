const steps = ["اختر المورد", "اختر المنتج", "حدد موقعك", "تابع الطلب حتى التوصيل"];

const services = ["مياه عبوات", "مياه كراتين", "صهاريج مياه", "توصيل مجدول"];

export default function LandingPage({ onNavigate }) {
  return (
    <main className="landing-page" dir="rtl">
      <header className="landing-header">
        <a
          className="landing-logo"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate?.("/");
          }}
        >
          <span className="brand-mark">ف</span>
          <span>فلج</span>
        </a>
        <nav className="landing-nav" aria-label="روابط الدخول">
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
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow">appfalaj.com</p>
          <h1>فلج — منصة توصيل المياه في عُمان</h1>
          <p className="landing-description">
            اطلب مياه الشرب، العبوات، والصهاريج من الموردين القريبين منك بسهولة وسرعة.
          </p>
          <div className="landing-actions">
            <button type="button" onClick={() => onNavigate?.("/company/login")}>
              دخول الموردين
            </button>
            <button type="button" className="ghost" onClick={() => onNavigate?.("/admin")}>
              دخول الأدمن
            </button>
            <button type="button" className="ghost" onClick={() => onNavigate?.("/driver")}>
              دخول السائق
            </button>
            <button type="button" className="ghost" disabled>
              تطبيق الزبون قريبًا / Coming Soon
            </button>
          </div>
        </div>

        <div className="landing-visual" aria-hidden="true">
          <div className="water-card main">
            <span>مياه</span>
            <strong>توصيل سريع</strong>
          </div>
          <div className="water-card small">
            <span>عبوات</span>
            <strong>كراتين</strong>
          </div>
          <div className="water-card small">
            <span>صهاريج</span>
            <strong>مجدول</strong>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="landing-eyebrow">كيف يعمل فلج؟</p>
          <h2>رحلة طلب بسيطة من البداية حتى التوصيل</h2>
        </div>
        <div className="landing-grid four">
          {steps.map((step, index) => (
            <article className="landing-card" key={step}>
              <span className="step-number">{index + 1}</span>
              <h3>{step}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="landing-eyebrow">خدمات فلج</p>
          <h2>خيارات مياه تناسب البيت والعمل والمزرعة</h2>
        </div>
        <div className="landing-grid four">
          {services.map((service) => (
            <article className="landing-card service" key={service}>
              <h3>{service}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section audience-section">
        <article className="landing-card audience">
          <h2>للموردين</h2>
          <p>انضم إلى فلج وابدأ استقبال الطلبات وإدارة السائقين والمبيعات من لوحة واحدة.</p>
          <button type="button" onClick={() => onNavigate?.("/company/login")}>
            دخول الموردين
          </button>
        </article>
        <article className="landing-card audience">
          <h2>للسائقين</h2>
          <p>تابع طلباتك اليومية وحدّث حالة التوصيل من صفحة السائق.</p>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/driver")}>
            دخول السائق
          </button>
        </article>
        <article className="landing-card audience">
          <h2>للأدمن</h2>
          <p>إدارة الموردين، الطلبات، العمولات، التسويات، والتتبع من لوحة تحكم مركزية.</p>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/admin")}>
            دخول الأدمن
          </button>
        </article>
      </section>

      <footer className="landing-footer">
        <span>appfalaj.com</span>
        <span>info@appfalaj.com</span>
        <span>© Falaj</span>
      </footer>
    </main>
  );
}
