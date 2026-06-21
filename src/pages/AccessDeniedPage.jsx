export default function AccessDeniedPage({ message, onNavigate }) {
  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">ف</span>
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
