export default function LandingPage({ onNavigate }) {
  return (
    <main className="landing-page" dir="rtl">
      <section className="landing-hero">
        <div className="landing-brand">
          <span className="brand-mark">ف</span>
          <span>Falaj</span>
        </div>
        <h1>منصة فلج لتوصيل المياه</h1>
        <div className="landing-actions">
          <button type="button" onClick={() => onNavigate?.("/company/login")}>
            دخول الموردين
          </button>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/admin/login")}>
            دخول الأدمن
          </button>
          <button type="button" className="ghost" onClick={() => onNavigate?.("/driver")}>
            دخول السائق
          </button>
        </div>
      </section>
    </main>
  );
}
