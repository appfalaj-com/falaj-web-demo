export default function DriverLoginPendingPage({ onNavigate }) {
  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">ف</span>
          <div>
            <strong>فلج</strong>
            <small>دخول السائقين</small>
          </div>
        </div>
        <h1>دخول السائقين قيد الإعداد</h1>
        <p className="pending-copy">
          لا يتم عرض أي طلبات أو مواقع أو بيانات سائقين قبل جاهزية نظام دخول السائقين.
        </p>
        <button type="button" className="ghost" onClick={() => onNavigate?.("/")}>
          العودة للصفحة الرئيسية
        </button>
      </section>
    </main>
  );
}
