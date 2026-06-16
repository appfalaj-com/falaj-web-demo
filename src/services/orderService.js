import { mockOrders } from "../data/mockData.js";

export function getOrders(orders = mockOrders) {
  return orders;
}

export function getOrdersByCompany(companyId, orders = mockOrders) {
  if (!companyId) return orders;
  return orders.filter((order) => order.companyId === companyId || !order.companyId);
}

export function getOrdersByDriver(driverId, orders = mockOrders) {
  return orders.filter((order) => order.driverId === driverId && order.status !== "rejected");
}

export function getNewOrders(orders = mockOrders) {
  return orders.filter((order) => order.status === "pending");
}

export function getActiveOrders(orders = mockOrders) {
  return orders.filter((order) =>
    ["active", "accepted", "assigned", "en_route", "arrived"].includes(order.status)
  );
}

export function getCompletedOrders(orders = mockOrders) {
  return orders.filter((order) => ["completed", "delivered"].includes(order.status));
}
