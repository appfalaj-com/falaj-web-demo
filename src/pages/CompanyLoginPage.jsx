import { useState } from "react";
import {
  COMPANY_AUTH_ERRORS,
  sendCompanyPhoneOtp,
  signInCompanyWithEmail,
  verifyCompanyPhoneOtp,
} from "../services/companyAuthService.js";

export default function CompanyLoginPage({ onAuthenticated }) {
  const [activeTab, setActiveTab] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEmailLogin(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      const authState = await signInCompanyWithEmail(email.trim(), password);
      onAuthenticated(authState);
    } catch (authError) {
      setError(authError.message || "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendOtp(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      await sendCompanyPhoneOtp(phone.trim());
      setOtpSent(true);
      setStatus("تم إرسال رمز التحقق إلى رقم الهاتف.");
    } catch (authError) {
      setError(authError.message || COMPANY_AUTH_ERRORS.PHONE_DISABLED);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      const authState = await verifyCompanyPhoneOtp(phone.trim(), otp.trim());
      onAuthenticated(authState);
    } catch (authError) {
      setError(authError.message || "رمز التحقق غير صحيح أو انتهت صلاحيته.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel" aria-labelledby="company-login-title">
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt="فلج" />
          <div>
            <strong>فلج</strong>
            <small>دخول الموردين والشركات</small>
          </div>
        </div>

        <header className="login-header">
          <p className="eyebrow">لوحة الموردين</p>
          <h1 id="company-login-title">تسجيل الدخول إلى حساب الشركة</h1>
        </header>

        <div className="login-tabs" role="tablist" aria-label="طرق تسجيل الدخول">
          <button
            type="button"
            className={activeTab === "email" ? "active" : ""}
            role="tab"
            aria-selected={activeTab === "email"}
            onClick={() => {
              setActiveTab("email");
              setError("");
              setStatus("");
            }}
          >
            الدخول بالإيميل
          </button>
          <button
            type="button"
            className={activeTab === "phone" ? "active" : ""}
            role="tab"
            aria-selected={activeTab === "phone"}
            onClick={() => {
              setActiveTab("phone");
              setError("");
              setStatus("");
            }}
          >
            الدخول برقم الهاتف
          </button>
        </div>

        {error ? <p className="auth-alert error">{error}</p> : null}
        {status ? <p className="auth-alert success">{status}</p> : null}

        {activeTab === "email" ? (
          <form className="auth-form" onSubmit={handleEmailLogin}>
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
        ) : (
          <form className="auth-form" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            <label>
              رقم الهاتف
              <input
                type="tel"
                dir="ltr"
                autoComplete="tel"
                placeholder="+96890001111"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </label>
            {otpSent ? (
              <label>
                رمز التحقق
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  required
                />
              </label>
            ) : null}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "جاري المعالجة..." : otpSent ? "تحقق من الرمز" : "إرسال رمز التحقق"}
            </button>
            {otpSent ? (
              <button
                type="button"
                className="ghost"
                disabled={isSubmitting}
                onClick={() => {
                  setOtp("");
                  setOtpSent(false);
                  setStatus("");
                  setError("");
                }}
              >
                تغيير رقم الهاتف
              </button>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}
