import { formatMoney } from "./adminFinanceService.js";

export function getAdminMetrics(orders) {
  return {
    totalOrders: orders.length,
    paidOrders: orders.filter((order) => order.paymentStatus === "paid").length,
    unpaidOrders: orders.filter((order) => order.paymentStatus === "unpaid").length,
    uncollectedCash: orders.filter(isCashUncollected).reduce((sum, order) => sum + order.amount, 0),
  };
}

function isCashUncollected(order) {
  return order.paymentMethod === "cash" && order.paymentStatus !== "paid";
}

export function getAdminDashboardMetrics(orders, suppliers, finance) {
  const activeDeliveryStatuses = ["accepted", "assigned", "en_route", "arrived"];
  const today = new Date().toDateString();
  const todayOrders = orders.filter((order) => {
    if (!order.createdAt && !order.created_at) return true;
    return new Date(order.createdAt ?? order.created_at).toDateString() === today;
  });

  return {
    pendingSuppliers: suppliers.filter((supplier) => supplier.status === "pending").length,
    approvedSuppliers: suppliers.filter((supplier) => supplier.status === "approved").length,
    todayOrders: todayOrders.length,
    todaySales: formatMoney(finance.totalSales),
    todayCommission: formatMoney(finance.falajCommission),
    activeDeliveries: orders.filter((order) => activeDeliveryStatuses.includes(order.status)).length,
    lateOrders: orders.filter((order) => order.isLate || order.status === "failed").length,
  };
}
