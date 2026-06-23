import { getActiveOrders, getCompletedOrders, getNewOrders, getOrdersByCompany } from "./orderService.js";

export function getDashboardMetrics(orders) {
  const newOrders = getNewOrders(orders);
  const activeOrders = getActiveOrders(orders);
  const completedOrders = getCompletedOrders(orders);
  const cashToday = orders
    .filter((order) => order.paymentMethod === "cash" && order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.amount, 0);
  const uncollectedCash = orders.filter(isCashUncollected).reduce((sum, order) => sum + order.amount, 0);

  return {
    newOrders,
    activeOrders,
    completedOrders,
    cashToday,
    uncollectedCash,
  };
}

export function getCompanyOrders(companyId, orders) {
  return getOrdersByCompany(companyId, orders);
}

function isCashUncollected(order) {
  return order.paymentMethod === "cash" && order.paymentStatus !== "paid";
}
