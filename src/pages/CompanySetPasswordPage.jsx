import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function CompanySetPasswordPage({ onSaved }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("كلمة المرور يجب ألا تقل عن 8 أحرف.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }

    if (!supabase) {
      setError("تعذر الاتصال بخدمة تسجيل الدخول حاليًا.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setPassword("");
      setConfirmPassword("");
      setMessage("تم حفظ كلمة المرور بنجاح");

      window.setTimeout(() => {
        onSaved?.();
      }, 900);
    } catch (updateError) {
      setError(updateError.message || "تعذر حفظ كلمة المرور. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel falaj-auth-card" aria-labelledby="company-set-password-title">
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt="فلج" />
          <div>
            <strong>فلج</strong>
            <small>إعداد حساب المورد</small>
          </div>
        </div>

        <header className="login-header">
          <p className="eyebrow">لوحة الموردين</p>
          <h1 id="company-set-password-title">إعداد كلمة المرور</h1>
          <p className="auth-note">
            احفظ كلمة مرور لحسابك حتى تتمكن من الدخول لاحقًا بالبريد الإلكتروني وكلمة المرور.
          </p>
        </header>

        {message ? <p className="auth-alert success">{message}</p> : null}
        {error ? <p className="auth-alert error">{error}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            كلمة المرور الجديدة
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <label>
            تأكيد كلمة المرور
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <p className="auth-note">الشروط: لا تقل عن 8 أحرف، ويجب أن تطابق كلمة المرور التأكيد.</p>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "جاري حفظ كلمة المرور..." : "حفظ كلمة المرور"}
          </button>
        </form>
      </section>
    </main>
  );
}
