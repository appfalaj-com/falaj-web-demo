import { isCashUncollected } from "../data/mockData.js";

export function getAdminMetrics(orders) {
  return {
    totalOrders: orders.length,
    paidOrders: orders.filter((order) => order.paymentStatus === "paid").length,
    unpaidOrders: orders.filter((order) => order.paymentStatus === "unpaid").length,
    uncollectedCash: orders.filter(isCashUncollected).reduce((sum, order) => sum + order.amount, 0),
  };
}
