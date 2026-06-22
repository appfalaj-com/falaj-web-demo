import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function DriverLoginPage({ onNavigate }) {
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handlePasswordLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!supabase) {
        throw new Error("Supabase غير مهيأ.");
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        throw loginError;
      }

      onNavigate?.("/driver");
    } catch (loginError) {
      setError(loginError?.message || "تعذر تسجيل دخول السائق.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!supabase) {
        throw new Error("Supabase غير مهيأ.");
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/driver`,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setMessage("تم إرسال رابط دخول آمن إلى بريد السائق.");
    } catch (otpError) {
      setError(otpError?.message || "تعذر إرسال رابط الدخول الآمن.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel">
        <div className="login-brand">
          <img src="/brand/Falaj_Icon.png" alt="فلج" />
          <div>
            <strong>فلج</strong>
            <small>دخول السائق</small>
          </div>
        </div>

        <div className="login-header">
          <h1>دخول السائقين</h1>
          <p>استخدم حساب السائق المرتبط من الشركة لعرض الطلبات ومشاركة الموقع.</p>
        </div>

        <div className="login-tabs" role="tablist" aria-label="طريقة الدخول">
          <button
            type="button"
            className={mode === "password" ? "active" : undefined}
            onClick={() => setMode("password")}
          >
            كلمة المرور
          </button>
          <button
            type="button"
            className={mode === "link" ? "active" : undefined}
            onClick={() => setMode("link")}
          >
            رابط آمن
          </button>
        </div>

        {error && <div className="auth-alert error">{error}</div>}
        {message && <div className="auth-alert success">{message}</div>}

        <form className="auth-form" onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}>
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

          {mode === "password" && (
            <label>
              كلمة المرور
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "جاري المعالجة..." : mode === "password" ? "دخول السائق" : "إرسال رابط الدخول"}
          </button>
        </form>
      </section>
    </main>
  );
}
