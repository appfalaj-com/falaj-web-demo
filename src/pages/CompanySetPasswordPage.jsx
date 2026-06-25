import { useEffect, useState } from "react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";

export default function CompanySetPasswordPage({ onSaved, accountKind = "company", verifyLoginAfterSave = false }) {
  const { direction, t } = useI18n();
  const copy = getSetPasswordCopy(accountKind, t);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingSession, setIsPreparingSession] = useState(true);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryUserId, setRecoveryUserId] = useState("");
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [recoveryErrorKind, setRecoveryErrorKind] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function prepareRecoverySession() {
      setError("");
      setMessage("");
      setRecoveryErrorKind("");

      if (!supabase) {
        if (!cancelled) {
          setError(t("password.noConnection"));
          setIsPreparingSession(false);
        }
        return;
      }

      try {
        const sessionResult = await ensureRecoverySession();
        if (cancelled) return;

        if (!sessionResult.session) {
          setHasRecoverySession(false);
          setRecoveryErrorKind("missing_link");
          setError("افتح رابط تعيين كلمة المرور من البريد. لا يمكن تغيير كلمة المرور من جلسة مفتوحة مسبقًا.");
          return;
        }

        await validateRecoveryAccount(sessionResult.session, accountKind);
        if (cancelled) return;

        setHasRecoverySession(true);
        setRecoveryUserId(sessionResult.session.user?.id || "");
        setRecoveryEmail(sessionResult.session.user?.email || "");
      } catch (sessionError) {
        if (cancelled) return;

        if (import.meta.env.DEV) {
          console.warn("set_password_recovery_session_failed", {
            message: sessionError?.message,
            code: sessionError?.code,
            status: sessionError?.status,
          });
        }

        setHasRecoverySession(false);
        setRecoveryErrorKind(sessionError?.stage === "invalid_recovery_link" ? "invalid_link" : "");
        setError(getSetPasswordErrorMessage(sessionError, "تعذر فتح رابط تعيين كلمة المرور. قد يكون الرابط منتهيًا أو مستخدمًا مسبقًا."));
      } finally {
        if (!cancelled) setIsPreparingSession(false);
      }
    }

    prepareRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [accountKind, t]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError(t("password.short"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("password.mismatch"));
      return;
    }

    if (!supabase) {
      setError(t("password.noConnection"));
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw Object.assign(sessionError, { stage: "session" });
      if (!sessionData?.session) {
        throw Object.assign(new Error("Recovery session is missing"), { stage: "session_missing" });
      }

      const emailForLoginTest = sessionData.session.user?.email || recoveryEmail;
      if (!emailForLoginTest || sessionData.session.user?.id !== recoveryUserId) {
        throw Object.assign(new Error("Recovery session user changed"), { stage: "session_mismatch" });
      }

      await validateRecoveryAccount(sessionData.session, accountKind);

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw Object.assign(updateError, { stage: "update_password" });

      if (verifyLoginAfterSave || accountKind === "company") {
        const verifyResult = await verifyPasswordLogin(emailForLoginTest, password, accountKind);
        if (!verifyResult.ok) throw Object.assign(verifyResult.error, { stage: "login_verify" });
      } else {
        await supabase.auth.signOut();
      }

      setPassword("");
      setConfirmPassword("");
      setMessage(
        verifyLoginAfterSave
          ? "تم حفظ كلمة المرور والتحقق من تسجيل الدخول. يمكنك الدخول الآن من صفحة السائق."
          : t("password.success")
      );

      window.setTimeout(() => {
        onSaved?.();
      }, 900);
    } catch (updateError) {
      if (import.meta.env.DEV) {
        console.warn("set_password_failed", {
          stage: updateError?.stage,
          message: updateError?.message,
          code: updateError?.code,
          status: updateError?.status,
        });
      }

      setError(getSetPasswordErrorMessage(updateError, t("password.error")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page" dir={direction}>
      <section className="login-panel falaj-auth-card" aria-labelledby="company-set-password-title">
        <LanguageToggle className="auth-language-toggle" />
        <div className="login-brand">
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt={t("common.appName")} />
          <div>
            <strong>{t("common.appName")}</strong>
            <small>{copy.brand}</small>
          </div>
        </div>

        <header className="login-header">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 id="company-set-password-title">{copy.title}</h1>
          <p className="auth-note">
            {copy.note}
          </p>
        </header>

        {message ? <p className="auth-alert success">{message}</p> : null}
        {error ? <p className="auth-alert error">{error}</p> : null}
        {error && !hasRecoverySession ? (
          <button type="button" className="auth-text-button" onClick={() => navigateAfterRecoveryError(accountKind)}>
            {getRecoveryErrorActionLabel(accountKind, recoveryErrorKind)}
          </button>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            {t("common.newPassword")}
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
            {t("common.confirmPassword")}
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <p className="auth-note">{t("password.rules")}</p>

          <button type="submit" disabled={isSubmitting || isPreparingSession || !hasRecoverySession}>
            {isPreparingSession ? "جاري التحقق من الرابط..." : isSubmitting ? t("password.saving") : t("password.save")}
          </button>
        </form>
      </section>
    </main>
  );
}

function getSetPasswordCopy(accountKind, t) {
  if (accountKind === "driver") {
    return {
      brand: "إعداد حساب السائق",
      eyebrow: "بوابة السائق",
      title: "إعداد كلمة مرور السائق",
      note: "احفظ كلمة مرور لحساب السائق حتى تتمكن من الدخول لاحقًا بالبريد أو رقم الهاتف وكلمة المرور.",
    };
  }

  return {
    brand: t("password.brand"),
    eyebrow: t("login.company.eyebrow"),
    title: t("password.title"),
    note: t("password.note"),
  };
}

async function ensureRecoverySession() {
  const currentUrl = new URL(window.location.href);
  const code = currentUrl.searchParams.get("code");
  const tokenHash = currentUrl.searchParams.get("token_hash");
  const tokenType = currentUrl.searchParams.get("type");

  if (code) {
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw Object.assign(error, { stage: "invalid_recovery_link" });
    stripAuthParamsFromUrl(currentUrl);
    return { session: data?.session ?? null };
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hashTokenHash = hashParams.get("token_hash");
  const hashTokenType = hashParams.get("type");

  if (tokenHash || hashTokenHash) {
    const otpType = tokenType || hashTokenType;
    if (!["invite", "recovery"].includes(otpType)) {
      await supabase.auth.signOut();
      return { session: null };
    }

    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash || hashTokenHash,
      type: otpType,
    });
    if (error) throw Object.assign(error, { stage: "invalid_recovery_link" });
    stripAuthParamsFromUrl(currentUrl);
    return { session: data?.session ?? null };
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const hashType = hashParams.get("type");

  if (accessToken && refreshToken) {
    if (hashType !== "recovery") {
      await supabase.auth.signOut();
      return { session: null };
    }

    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw Object.assign(error, { stage: "invalid_recovery_link" });
    stripAuthParamsFromUrl(currentUrl);
    return { session: data?.session ?? null };
  }

  await supabase.auth.signOut();
  return { session: null };
}

async function validateRecoveryAccount(session, accountKind) {
  const user = session?.user;
  const email = user?.email || "";
  if (!user?.id || !email) {
    throw Object.assign(new Error("Recovery user is missing"), { stage: "session_missing" });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, role, account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw Object.assign(profileError, { stage: "account_check" });

  if (!profile) {
    await supabase.auth.signOut();
    throw Object.assign(new Error("Recovery account profile is missing"), { stage: "wrong_account_type" });
  }

  const role = String(profile.role || "").toLowerCase();
  const accountType = String(profile.account_type || "").toLowerCase();

  if (accountKind === "driver") {
    if (role === "company" || accountType === "company" || role === "admin" || accountType === "admin") {
      await supabase.auth.signOut();
      throw Object.assign(new Error("Company/admin account cannot use driver password reset"), {
        stage: "wrong_account_type",
      });
    }

    if (role !== "driver" || accountType !== "driver") {
      await supabase.auth.signOut();
      throw Object.assign(new Error("Recovery account is not a driver"), { stage: "wrong_account_type" });
    }

    await supabase.rpc("accept_driver_invite_for_current_user");

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, profile_id, email, is_active")
      .eq("profile_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (driverError) throw Object.assign(driverError, { stage: "account_check" });
    if (!driver || String(driver.email || "").toLowerCase() !== email.toLowerCase()) {
      await supabase.auth.signOut();
      throw Object.assign(new Error("Recovery account is not linked to an active driver"), {
        stage: "wrong_account_type",
      });
    }

    return;
  }

  if (role === "driver" || accountType === "driver" || role === "admin" || accountType === "admin") {
    await supabase.auth.signOut();
    throw Object.assign(new Error("Driver/admin account cannot use company password reset"), {
      stage: "wrong_account_type",
    });
  }

  if (role !== "company" || accountType !== "company") {
    await supabase.auth.signOut();
    throw Object.assign(new Error("Recovery account is not a company"), { stage: "wrong_account_type" });
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (companyError) throw Object.assign(companyError, { stage: "account_check" });
  if (!company) {
    await supabase.auth.signOut();
    throw Object.assign(new Error("Recovery account is not linked to a company"), { stage: "wrong_account_type" });
  }
}

async function verifyPasswordLogin(email, password, accountKind) {
  await supabase.auth.signOut();

  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) {
    return { ok: false, error: loginError };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    await supabase.auth.signOut();
    return { ok: false, error: sessionError || new Error("Login verification session missing") };
  }

  try {
    await validateRecoveryAccount(sessionData.session, accountKind);
  } catch (accountError) {
    return { ok: false, error: accountError };
  } finally {
    await supabase.auth.signOut();
  }

  return { ok: true, error: null };
}

function stripAuthParamsFromUrl(currentUrl) {
  currentUrl.searchParams.delete("code");
  currentUrl.searchParams.delete("token_hash");
  currentUrl.searchParams.delete("type");
  currentUrl.hash = "";
  window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}`);
}

function getRecoveryErrorActionLabel(accountKind, recoveryErrorKind) {
  if (accountKind === "driver") {
    return recoveryErrorKind === "invalid_link" ? "طلب رابط جديد من الشركة" : "العودة لتسجيل دخول السائق";
  }

  return "العودة لتسجيل دخول المورد";
}

function navigateAfterRecoveryError(accountKind) {
  window.location.assign(accountKind === "driver" ? "/driver/login" : "/company/login");
}

function getSetPasswordErrorMessage(error, fallback) {
  const message = String(error?.message || "").toLowerCase();
  const stage = error?.stage;

  if (stage === "invalid_recovery_link") {
    return "رابط تعيين كلمة المرور منتهي أو تم استخدامه مسبقًا. اطلب رابطًا جديدًا.";
  }

  if (stage === "session_missing" || message.includes("auth session missing")) {
    return "رابط تعيين كلمة المرور غير صالح أو منتهي. اطلب رابطًا جديدًا وحاول مرة أخرى.";
  }

  if (stage === "session_mismatch") {
    return "تغيّرت جلسة المستخدم أثناء تعيين كلمة المرور. افتح رابطًا جديدًا من البريد.";
  }

  if (stage === "wrong_account_type") {
    return "رابط تعيين كلمة المرور لا يطابق نوع هذا الحساب. استخدم الرابط الصحيح للحساب المطلوب.";
  }

  if (stage === "account_check") {
    return "تعذر التحقق من نوع الحساب المرتبط بالرابط. اطلب رابطًا جديدًا وحاول مرة أخرى.";
  }

  if (stage === "update_password") {
    if (message.includes("same_password") || message.includes("different from the old password")) {
      return "كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية.";
    }

    return "تعذر حفظ كلمة المرور الجديدة في حسابك. افتح رابطًا جديدًا وحاول مرة أخرى.";
  }

  if (stage === "login_verify") {
    return "تمت محاولة حفظ كلمة المرور، لكن اختبار تسجيل الدخول فشل. اطلب رابطًا جديدًا وعيّن كلمة المرور مرة أخرى.";
  }

  if (message.includes("expired") || message.includes("invalid") || message.includes("otp")) {
    return "رابط تعيين كلمة المرور منتهي أو غير صالح. اطلب رابطًا جديدًا.";
  }

  return fallback;
}
