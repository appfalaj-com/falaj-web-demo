import { useEffect, useState } from "react";
import Layout from "./components/Layout.jsx";
import AccessDeniedPage from "./pages/AccessDeniedPage.jsx";
import AdminFinancePage from "./pages/AdminFinancePage.jsx";
import AdminLiveTrackingPage from "./pages/AdminLiveTrackingPage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import AdminOrdersPage from "./pages/AdminOrdersPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AdminProductModerationPage from "./pages/AdminProductModerationPage.jsx";
import AdminSupplierAccountPage from "./pages/AdminSupplierAccountPage.jsx";
import AdminSupplierRequestsPage from "./pages/AdminSupplierRequestsPage.jsx";
import AdminSuppliersPage from "./pages/AdminSuppliersPage.jsx";
import CompanyDashboard from "./pages/CompanyDashboard.jsx";
import CompanyDriversLivePage from "./pages/CompanyDriversLivePage.jsx";
import CompanyDriversPage from "./pages/CompanyDriversPage.jsx";
import CompanyLoginPage from "./pages/CompanyLoginPage.jsx";
import CompanyOrdersPage from "./pages/CompanyOrdersPage.jsx";
import CompanyPendingReviewPage from "./pages/CompanyPendingReviewPage.jsx";
import CompanyProductsPage from "./pages/CompanyProductsPage.jsx";
import CompanySetPasswordPage from "./pages/CompanySetPasswordPage.jsx";
import DriverLoginPage from "./pages/DriverLoginPage.jsx";
import DriverPage from "./pages/DriverPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import SupplierJoinPage from "./pages/SupplierJoinPage.jsx";
import { getAuthContext, signOutCompany } from "./services/companyAuthService.js";

const PROTECTED_COMPANY_PATHS = new Set([
  "/company",
  "/company/set-password",
  "/company/orders",
  "/company/products",
  "/company/drivers",
  "/company/drivers/live",
]);

function isAdminPath(path) {
  return path === "/admin" || path.startsWith("/admin/");
}

function getSupplierAccountCompanyId(path) {
  const match = path.match(/^\/admin\/suppliers\/([^/]+)(?:\/account)?$/);
  return match?.[1] ?? null;
}

function isRejectedCompany(company) {
  return company?.onboarding_status === "rejected";
}

function isPendingCompany(company) {
  return Boolean(company) && (!company.is_active || company.onboarding_status !== "activated");
}

export default function App() {
  const [authState, setAuthState] = useState({
    status: "loading",
    user: null,
    profile: null,
    company: null,
    companyError: "",
    error: "",
  });
  const [currentPath, setCurrentPath] = useState(
    window.location.pathname.replace(/\/$/, "") || "/"
  );
  const companyId = authState.company?.id ?? null;



  function navigate(path) {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  }

  function replacePath(path) {
    window.history.replaceState({}, "", path);
    setCurrentPath(path);
  }

  function handleAuthenticated(nextAuthState) {
    setAuthState({ status: "authenticated", ...nextAuthState, error: "" });
    replacePath(nextAuthState.role === "admin" ? "/admin" : "/company");
  }

  async function handleSignOut() {
    await signOutCompany();
    setAuthState({ status: "anonymous", user: null, profile: null, company: null, companyError: "", error: "" });
    replacePath("/");
  }

  function handleCompanyUpdated(company) {
    setAuthState((current) => ({
      ...current,
      company: company ? { ...current.company, ...company } : current.company,
    }));
  }

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname.replace(/\/$/, "") || "/");
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanySession() {
      try {
        const nextAuthState = await getAuthContext();
        if (!cancelled) {
          setAuthState({
            status: nextAuthState.session ? "authenticated" : "anonymous",
            user: nextAuthState.user,
            profile: nextAuthState.profile,
            role: nextAuthState.role,
            company: nextAuthState.company,
            companyError: nextAuthState.companyError || "",
            error: "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setAuthState({
            status: "anonymous",
            user: null,
            profile: null,
            company: null,
            companyError: "",
            error: error.message,
          });
        }
      }
    }

    loadCompanySession();

    return () => {
      cancelled = true;
    };
  }, []);


  const routes = {
    "/company": (
      <CompanyDashboard
        companyId={companyId}
        company={authState.company}
        onCompanyUpdated={handleCompanyUpdated}
        onNavigate={navigate}
      />
    ),
    "/company/orders": <CompanyOrdersPage companyId={companyId} />,
    "/company/products": <CompanyProductsPage companyId={companyId} />,
    "/company/drivers": <CompanyDriversPage companyId={companyId} />,
    "/company/drivers/live": <CompanyDriversLivePage companyId={companyId} />,
    "/admin": <AdminPage onNavigate={navigate} />,
    "/admin/orders": <AdminOrdersPage />,
    "/admin/product-moderation": <AdminProductModerationPage />,
    "/admin/suppliers": <AdminSuppliersPage onNavigate={navigate} />,
    "/admin/supplier-requests": <AdminSupplierRequestsPage />,
    "/admin/finance": <AdminFinancePage onNavigate={navigate} />,
    "/admin/live-tracking": <AdminLiveTrackingPage />,
  };
  const supplierAccountCompanyId = getSupplierAccountCompanyId(currentPath);

  if (supplierAccountCompanyId) {
    routes[currentPath] = (
      <AdminSupplierAccountPage companyId={supplierAccountCompanyId} onNavigate={navigate} />
    );
  }

  if (currentPath === "/company/login") {
    return <CompanyLoginPage onAuthenticated={handleAuthenticated} />;
  }

  if (currentPath === "/company/set-password") {
    return <CompanySetPasswordPage accountKind="company" onSaved={() => replacePath("/company/login")} />;
  }

  if (currentPath === "/") {
    return <LandingPage onNavigate={navigate} />;
  }

  if (currentPath === "/supplier-join") {
    return <SupplierJoinPage onNavigate={navigate} />;
  }

  if (currentPath === "/admin/login") {
    return <AdminLoginPage onAuthenticated={handleAuthenticated} />;
  }

  if (currentPath === "/driver/login") {
    return <DriverLoginPage onNavigate={navigate} />;
  }

  if (currentPath === "/driver/set-password") {
    return (
      <CompanySetPasswordPage
        accountKind="driver"
        verifyLoginAfterSave
        onSaved={() => replacePath("/driver/login")}
      />
    );
  }

  if (currentPath === "/driver") {
    return <DriverPage onNavigate={navigate} />;
  }

  if (PROTECTED_COMPANY_PATHS.has(currentPath)) {
    const logCompanyGuardDecision = (decision) => {
      if (!import.meta.env.DEV) return;
      console.info("[Falaj company guard]", {
        userId: authState.user?.id,
        metadataCompanyId: authState.user?.user_metadata?.company_id,
        profileRole: authState.profile?.role,
        profileAccountType: authState.profile?.account_type,
        selectedCompanyId: authState.company?.id,
        selectedCompanyOnboardingStatus: authState.company?.onboarding_status,
        selectedCompanyIsActive: authState.company?.is_active,
        companyError: authState.companyError,
        decision,
      });
    };

    if (authState.status === "loading") {
      return (
        <main className="login-page" dir="rtl">
          <section className="login-panel falaj-auth-card">
            <p className="eyebrow">فلج</p>
            <h1>جاري التحقق من صلاحية الدخول...</h1>
          </section>
        </main>
      );
    }

    if (authState.status !== "authenticated") {
      logCompanyGuardDecision("login_required");
      return <CompanyLoginPage onAuthenticated={handleAuthenticated} />;
    }

    if (!authState.profile) {
      logCompanyGuardDecision("incomplete_profile_link");
      return (
        <AccessDeniedPage
          message="حساب المورد غير مكتمل الربط. يرجى التواصل مع إدارة فلج."
          onNavigate={navigate}
        />
      );
    }

    if (authState.role !== "company") {
      logCompanyGuardDecision("unauthorized");
      return (
        <AccessDeniedPage
          message="هذا الحساب غير مصرح له بالدخول إلى لوحة الموردين"
          onNavigate={navigate}
        />
      );
    }

    if (authState.company) {
      if (isRejectedCompany(authState.company)) {
        logCompanyGuardDecision("rejected");
        return (
          <AccessDeniedPage
            message="طلب المورد المرتبط بهذا الحساب مرفوض. يمكنكم تقديم طلب انضمام جديد."
            onNavigate={navigate}
          />
        );
      }

      if (isPendingCompany(authState.company) && currentPath !== "/company/set-password") {
        logCompanyGuardDecision("pending");
        return <CompanyPendingReviewPage onSignedOut={handleSignOut} />;
      }

      logCompanyGuardDecision("active");
    }

    if (authState.companyError) {
      logCompanyGuardDecision("company_load_failed");
      return (
        <AccessDeniedPage
          message="تعذر تحميل بيانات الشركة المرتبطة بالحساب."
          onNavigate={navigate}
        />
      );
    }

    if (!authState.company) {
      logCompanyGuardDecision("company_missing");
      return (
        <AccessDeniedPage
          message="تعذر تحميل بيانات الشركة المرتبطة بالحساب."
          onNavigate={navigate}
        />
      );
    }
  }

  if (isAdminPath(currentPath)) {
    if (authState.status === "loading") {
      return (
        <main className="login-page" dir="rtl">
          <section className="login-panel falaj-auth-card">
            <p className="eyebrow">فلج</p>
            <h1>جاري التحقق من صلاحية الإدارة...</h1>
          </section>
        </main>
      );
    }

    if (authState.status !== "authenticated") {
      return <AdminLoginPage onAuthenticated={handleAuthenticated} />;
    }

    if (authState.role !== "admin") {
      return (
        <AccessDeniedPage
          message="غير مصرح لك بالدخول إلى لوحة الأدمن"
          onNavigate={navigate}
        />
      );
    }
  }

  if (!routes[currentPath]) {
    return <NotFoundPage onNavigate={navigate} />;
  }

  return (
    <Layout
      companyName={authState.company?.name}
      currentPath={currentPath}
      role={authState.role}
      onNavigate={navigate}
      onSignOut={authState.status === "authenticated" ? handleSignOut : null}
    >
      {routes[currentPath]}
    </Layout>
  );
}
