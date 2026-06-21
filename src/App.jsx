import { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout.jsx";
import OrderDetailsPanel from "./components/OrderDetailsPanel.jsx";
import { mockDrivers, mockOrders } from "./data/mockData.js";
import AccessDeniedPage from "./pages/AccessDeniedPage.jsx";
import AdminFinancePage from "./pages/AdminFinancePage.jsx";
import AdminLiveTrackingPage from "./pages/AdminLiveTrackingPage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AdminSupplierAccountPage from "./pages/AdminSupplierAccountPage.jsx";
import AdminSuppliersPage from "./pages/AdminSuppliersPage.jsx";
import CompanyDashboard from "./pages/CompanyDashboard.jsx";
import CompanyDriversLivePage from "./pages/CompanyDriversLivePage.jsx";
import CompanyDriversPage from "./pages/CompanyDriversPage.jsx";
import CompanyLoginPage from "./pages/CompanyLoginPage.jsx";
import CompanyOrdersPage from "./pages/CompanyOrdersPage.jsx";
import CompanyPendingReviewPage from "./pages/CompanyPendingReviewPage.jsx";
import CompanyProductsPage from "./pages/CompanyProductsPage.jsx";
import DriverLoginPendingPage from "./pages/DriverLoginPendingPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import SupplierJoinPage from "./pages/SupplierJoinPage.jsx";
import { getAuthContext, signOutCompany } from "./services/companyAuthService.js";
import { getDrivers } from "./services/driverService.js";
import { getOrders } from "./services/orderService.js";

const PROTECTED_COMPANY_PATHS = new Set([
  "/company",
  "/company/orders",
  "/company/products",
  "/company/drivers",
  "/company/drivers/live",
]);

function isAdminPath(path) {
  return path === "/admin" || path.startsWith("/admin/");
}

function getSupplierAccountCompanyId(path) {
  const match = path.match(/^\/admin\/suppliers\/([^/]+)\/account$/);
  return match?.[1] ?? null;
}

export default function App() {
  const [orders, setOrders] = useState(() => getOrders(mockOrders));
  const drivers = getDrivers(mockDrivers);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [authState, setAuthState] = useState({
    status: "loading",
    profile: null,
    company: null,
    error: "",
  });
  const [currentPath, setCurrentPath] = useState(
    window.location.pathname.replace(/\/$/, "") || "/"
  );
  const companyId = authState.company?.id ?? null;

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  function updateOrder(orderId, patch) {
    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === orderId ? { ...order, ...patch } : order))
    );
  }

  function acceptOrder(orderId) {
    updateOrder(orderId, { status: "accepted" });
  }

  function rejectOrder(orderId) {
    updateOrder(orderId, { status: "rejected", driverId: null });
  }

  function assignDriver(orderId) {
    const driver = drivers.find((item) => item.status !== "غير متصل") ?? drivers[0];
    updateOrder(orderId, { status: "assigned", driverId: driver.id });
  }

  function setDriverOrderStatus(orderId, nextStatus) {
    updateOrder(orderId, { status: nextStatus });
  }

  function markOrderPaid(orderId) {
    updateOrder(orderId, {
      paymentStatus: "paid",
      payment: "تم استلام الكاش",
      cashCollectedByDriver: true,
    });
  }

  function navigate(path) {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    setSelectedOrderId(null);
  }

  function replacePath(path) {
    window.history.replaceState({}, "", path);
    setCurrentPath(path);
    setSelectedOrderId(null);
  }

  function handleAuthenticated(nextAuthState) {
    setAuthState({ status: "authenticated", ...nextAuthState, error: "" });
    replacePath(nextAuthState.role === "admin" ? "/admin" : "/company");
  }

  async function handleSignOut() {
    await signOutCompany();
    setAuthState({ status: "anonymous", profile: null, company: null, error: "" });
    replacePath("/");
  }

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname.replace(/\/$/, "") || "/");
      setSelectedOrderId(null);
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
            profile: nextAuthState.profile,
            role: nextAuthState.role,
            company: nextAuthState.company,
            error: "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setAuthState({ status: "anonymous", profile: null, company: null, error: error.message });
        }
      }
    }

    loadCompanySession();

    return () => {
      cancelled = true;
    };
  }, []);

  const workflow = {
    orders,
    drivers,
    companyId,
    onSelectOrder: setSelectedOrderId,
    onAcceptOrder: acceptOrder,
    onRejectOrder: rejectOrder,
    onAssignDriver: assignDriver,
  };

  const routes = {
    "/company": <CompanyDashboard {...workflow} />,
    "/company/orders": <CompanyOrdersPage {...workflow} />,
    "/company/products": <CompanyProductsPage companyId={companyId} />,
    "/company/drivers": <CompanyDriversPage companyId={companyId} drivers={drivers} />,
    "/company/drivers/live": <CompanyDriversLivePage {...workflow} />,
    "/admin": <AdminPage orders={orders} drivers={drivers} onNavigate={navigate} />,
    "/admin/suppliers": <AdminSuppliersPage onNavigate={navigate} />,
    "/admin/finance": <AdminFinancePage orders={orders} onNavigate={navigate} />,
    "/admin/live-tracking": <AdminLiveTrackingPage orders={orders} drivers={drivers} />,
  };
  const supplierAccountCompanyId = getSupplierAccountCompanyId(currentPath);

  if (supplierAccountCompanyId) {
    routes[currentPath] = (
      <AdminSupplierAccountPage companyId={supplierAccountCompanyId} orders={orders} />
    );
  }

  if (currentPath === "/company/login") {
    return <CompanyLoginPage onAuthenticated={handleAuthenticated} />;
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

  if (currentPath === "/driver" || currentPath === "/driver/login") {
    return <DriverLoginPendingPage onNavigate={navigate} />;
  }

  if (PROTECTED_COMPANY_PATHS.has(currentPath)) {
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
      return <CompanyLoginPage onAuthenticated={handleAuthenticated} />;
    }

    if (authState.role !== "company" || !authState.company) {
      return (
        <AccessDeniedPage
          message="هذا الحساب غير مصرح له بالدخول إلى لوحة الموردين"
          onNavigate={navigate}
        />
      );
    }

    if (
      authState.company &&
      (authState.company.status ? authState.company.status !== "approved" : !authState.company.is_active)
    ) {
      return <CompanyPendingReviewPage onSignedOut={handleSignOut} />;
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
    return <LandingPage onNavigate={navigate} />;
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
      <OrderDetailsPanel
        order={selectedOrder}
        drivers={drivers}
        onClose={() => setSelectedOrderId(null)}
        onAccept={acceptOrder}
        onReject={rejectOrder}
        onAssign={assignDriver}
      />
    </Layout>
  );
}
