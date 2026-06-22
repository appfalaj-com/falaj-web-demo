import { useState } from "react";
import { signInAdminWithEmail } from "../services/companyAuthService.js";

export default function AdminLoginPage({ onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const authState = await signInAdminWithEmail(email.trim(), password);
      onAuthenticated(authState);
    } catch (authError) {
      setError(authError.message || "تعذر تسجيل الدخول إلى لوحة الإدارة.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel" aria-labelledby="admin-login-title">
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt="فلج" />
          <div>
            <strong>فلج</strong>
            <small>دخول الإدارة</small>
          </div>
        </div>

        <header className="login-header">
          <p className="eyebrow">لوحة الإدارة</p>
          <h1 id="admin-login-title">تسجيل دخول الأدمن</h1>
        </header>

        {error ? <p className="auth-alert error">{error}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            البريد الإلكتروني
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            كلمة المرور
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </section>
    </main>
  );
}
