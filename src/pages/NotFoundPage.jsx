export default function NotFoundPage({ onNavigate }) {
  const goTo = (path) => {
    onNavigate?.(path);
  };

  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel falaj-auth-card">
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt="فلج" />
          <div>
            <strong>فلج</strong>
            <small>منصة توصيل المياه</small>
          </div>
        </div>

        <p className="eyebrow">404</p>
        <h1>الصفحة غير موجودة</h1>
        <p className="auth-note">
          الرابط الذي تحاول فتحه غير متاح أو تم تغييره.
        </p>

        <div className="not-found-actions">
          <button type="button" onClick={() => goTo("/")}>
            العودة للرئيسية
          </button>
          <button type="button" className="ghost" onClick={() => goTo("/admin")}>
            دخول الأدمن
          </button>
          <button type="button" className="ghost" onClick={() => goTo("/company/login")}>
            دخول الموردين
          </button>
        </div>
      </section>
    </main>
  );
}
