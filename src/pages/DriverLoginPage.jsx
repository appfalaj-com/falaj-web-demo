import { useEffect, useState } from "react";
import { KeyRound, LogIn, Mail, Truck } from "lucide-react";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { clearExistingAuthSessionForLogin } from "../services/authSessionBoundary.js";
import {
  assertAuthenticatedActiveDriver,
  signInDriverWithIdentifier,
} from "../services/driverService.js";

export default function DriverLoginPage({ onNavigate }) {
  const { direction, t } = useI18n();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    clearExistingAuthSessionForLogin();
  }, []);

  async function handlePasswordLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      await signInDriverWithIdentifier(identifier, password);

      try {
        await assertAuthenticatedActiveDriver();
      } catch (driverError) {
        await supabase.auth.signOut();
        if (import.meta.env.DEV) {
          console.warn("driver_login_role_check_failed", {
            message: driverError?.message,
            code: driverError?.code,
          });
        }
        setError(t("driver.login.invalidCredentials"));
        return;
      }

      onNavigate?.("/driver");
    } catch (loginError) {
      if (import.meta.env.DEV) {
        console.warn("driver_login_failed", {
          message: loginError?.message,
          code: loginError?.code,
          status: loginError?.status,
        });
      }
      setError(t("driver.login.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="falaj-driver-app falaj-driver-login-app" dir={direction}>
      <header className="falaj-driver-bar falaj-driver-login-bar">
        <a
          className="falaj-driver-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate?.("/");
          }}
          aria-label="Falaj"
        >
          <img src="/brand/Falaj_Icon.png" alt="" />
          <span>
            <strong>Falaj</strong>
            <small>{t("login.driver.brand")}</small>
          </span>
        </a>
        <LanguageToggle className="falaj-driver-language" />
      </header>

      <main className="falaj-driver-login-main">
        <section className="falaj-driver-login-card">
          <div className="falaj-driver-login-intro">
            <span className="falaj-driver-login-symbol" aria-hidden="true">
              <Truck size={25} />
            </span>
            <div>
              <p>{t("login.driver.brand")}</p>
              <h1>{t("login.driver.title")}</h1>
              <span>{t("driver.login.identifierHelp")}</span>
            </div>
          </div>

          {error && <div className="falaj-driver-alert error" role="alert">{error}</div>}

          <form className="falaj-driver-login-form" onSubmit={handlePasswordLogin}>
            <label>
              <span>{t("driver.login.identifierLabel")}</span>
              <div className="falaj-driver-login-input">
                <Mail size={19} aria-hidden="true" />
                <input
                  type="text"
                  autoComplete="username"
                  inputMode="email"
                  dir="ltr"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                  placeholder={t("driver.login.identifierPlaceholder")}
                />
              </div>
            </label>

            <label>
              <span>{t("common.password")}</span>
              <div className="falaj-driver-login-input">
                <KeyRound size={19} aria-hidden="true" />
                <input
                  type="password"
                  autoComplete="current-password"
                  dir="ltr"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </label>

            <button type="submit" disabled={loading}>
              <LogIn size={19} aria-hidden="true" />
              {loading ? t("common.processing") : t("login.driver.submit")}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
