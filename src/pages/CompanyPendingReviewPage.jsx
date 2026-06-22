import { signOutCompany } from "../services/companyAuthService.js";

export default function CompanyPendingReviewPage({ onSignedOut }) {
  async function handleSignOut() {
    await signOutCompany();
    onSignedOut?.();
  }

  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel pending-panel">
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt="فلج" />
          <div>
            <strong>فلج</strong>
            <small>لوحة الموردين</small>
          </div>
        </div>
        <p className="eyebrow">إعداد الحساب</p>
        <h1>حساب المورد قيد الإعداد</h1>
        <p className="pending-copy">
          سيتم فتح لوحة الموردين بعد اكتمال إعداد الشركة وتفعيلها من إدارة فلج.
        </p>
        <button type="button" className="ghost" onClick={handleSignOut}>
          تسجيل الخروج
        </button>
      </section>
    </main>
  );
}
