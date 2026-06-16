import { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout.jsx";
import OrderDetailsPanel from "./components/OrderDetailsPanel.jsx";
import { mockDrivers, mockOrders } from "./data/mockData.js";
import AdminPage from "./pages/AdminPage.jsx";
import CompanyDashboard from "./pages/CompanyDashboard.jsx";
import CompanyDriversPage from "./pages/CompanyDriversPage.jsx";
import CompanyOrdersPage from "./pages/CompanyOrdersPage.jsx";
import CompanyProductsPage from "./pages/CompanyProductsPage.jsx";
import DriverPage from "./pages/DriverPage.jsx";
import { getDrivers } from "./services/driverService.js";
import { getOrders } from "./services/orderService.js";

export default function App() {
  const [orders, setOrders] = useState(() => getOrders(mockOrders));
  const drivers = getDrivers(mockDrivers);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [currentPath, setCurrentPath] = useState(
    window.location.pathname.replace(/\/$/, "") || "/company"
  );

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

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname.replace(/\/$/, "") || "/company");
      setSelectedOrderId(null);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const workflow = {
    orders,
    drivers,
    onSelectOrder: setSelectedOrderId,
    onAcceptOrder: acceptOrder,
    onRejectOrder: rejectOrder,
    onAssignDriver: assignDriver,
  };

  const routes = {
    "/company": <CompanyDashboard {...workflow} />,
    "/company/orders": <CompanyOrdersPage {...workflow} />,
    "/company/products": <CompanyProductsPage />,
    "/company/drivers": <CompanyDriversPage drivers={drivers} />,
    "/driver": (
      <DriverPage
        orders={orders}
        drivers={drivers}
        onSetStatus={setDriverOrderStatus}
        onMarkPaid={markOrderPaid}
      />
    ),
    "/admin": <AdminPage orders={orders} drivers={drivers} />,
  };

  return (
    <Layout currentPath={currentPath} onNavigate={navigate}>
      {routes[currentPath] ?? <CompanyDashboard {...workflow} />}
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
