export default function AccessDeniedPage({ message, onNavigate }) {
  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel">
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt="فلج" />
          <div>
            <strong>فلج</strong>
            <small>صلاحيات الدخول</small>
          </div>
        </div>
        <p className="auth-alert error">{message}</p>
        <button type="button" className="ghost" onClick={() => onNavigate?.("/")}>
          العودة للصفحة الرئيسية
        </button>
      </section>
    </main>
  );
}
