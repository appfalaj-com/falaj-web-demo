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
          <span className="brand-mark">ف</span>
          <div>
            <strong>فلج</strong>
            <small>لوحة الموردين</small>
          </div>
        </div>
        <p className="eyebrow">مراجعة الحساب</p>
        <h1>حسابكم قيد المراجعة من إدارة فلج</h1>
        <p className="pending-copy">
          سيتم فتح لوحة الموردين بعد اعتماد بيانات الشركة. يمكنكم العودة لاحقًا أو التواصل مع إدارة فلج.
        </p>
        <button type="button" className="ghost" onClick={handleSignOut}>
          تسجيل الخروج
        </button>
      </section>
    </main>
  );
}
