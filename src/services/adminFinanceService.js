import { mockOrders } from "../data/mockData.js";
import { supabase } from "../lib/supabaseClient.js";

export const MOCK_SUPPLIERS = [
  {
    id: "company-1",
    name: "فلج للمياه",
    phone: "968 9000 1111",
    email: "company@falaj.test",
    status: "approved",
    commissionRate: 8,
    createdAt: "2026-06-15T08:00:00Z",
    bankName: "بنك مسقط",
    bankAccountName: "شركة فلج للمياه",
    bankAccountNumber: "1234567890",
    iban: "OM0000000000000000000000",
  },
  {
    id: "company-pending",
    name: "مورد قيد المراجعة",
    phone: "968 9111 2222",
    email: "pending@falaj.test",
    status: "pending",
    commissionRate: 10,
    createdAt: "2026-06-20T08:00:00Z",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    iban: "",
  },
];

const STATUS_LABELS = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  suspended: "موقوف",
};

export function supplierStatusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

export function formatMoney(value) {
  return `${Number(value || 0).toFixed(3)} ر.ع`;
}

function normalizeCompany(company) {
  return {
    id: company.id,
    name: company.name,
    phone: company.phone,
    email: company.email,
    status: company.status ?? (company.is_active ? "approved" : "pending"),
    commissionRate: Number(company.commission_rate ?? 0),
    createdAt: company.created_at,
    bankName: company.bank_name ?? "",
    bankAccountName: company.bank_account_name ?? "",
    bankAccountNumber: company.bank_account_number ?? "",
    iban: company.iban ?? "",
  };
}

export async function getSuppliers() {
  if (!supabase) return MOCK_SUPPLIERS;

  const { data, error } = await supabase
    .from("companies")
    .select(
      [
        "id",
        "name",
        "phone",
        "email",
        "status",
        "is_active",
        "commission_rate",
        "created_at",
        "bank_name",
        "bank_account_name",
        "bank_account_number",
        "iban",
      ].join(",")
    )
    .order("created_at", { ascending: false });

  if (error) return MOCK_SUPPLIERS;
  return (data ?? []).map(normalizeCompany);
}

export async function updateSupplierStatus(companyId, status) {
  if (!supabase) return { id: companyId, status };

  const { data, error } = await supabase
    .from("companies")
    .update({ status, is_active: status === "approved" })
    .eq("id", companyId)
    .select()
    .single();

  if (error) throw error;
  return normalizeCompany(data);
}

export async function updateSupplierCommission(companyId, commissionRate) {
  if (!supabase) return { id: companyId, commissionRate };

  const { data, error } = await supabase
    .from("companies")
    .update({ commission_rate: commissionRate })
    .eq("id", companyId)
    .select()
    .single();

  if (error) throw error;
  return normalizeCompany(data);
}

export function buildFinancialRows(orders = mockOrders, suppliers = MOCK_SUPPLIERS) {
  return orders
    .filter((order) => order.status === "delivered" || order.status === "completed")
    .map((order) => {
      const companyId = order.companyId ?? "company-1";
      const supplier = suppliers.find((item) => item.id === companyId) ?? suppliers[0];
      const commissionRate = Number(supplier?.commissionRate ?? 8);
      const grossAmount = Number(order.amount || 0);
      const falajCommissionAmount = (grossAmount * commissionRate) / 100;
      const supplierNetAmount = grossAmount - falajCommissionAmount;
      const cashCollectedBy = order.paymentMethod === "cash" ? "company_driver" : null;

      return {
        id: `mock-fin-${order.id}`,
        orderId: order.id,
        companyId,
        supplierName: supplier?.name ?? "مورد غير محدد",
        grossAmount,
        paymentMethod: order.paymentMethod,
        cashCollectedBy,
        commissionRate,
        falajCommissionAmount,
        supplierNetAmount,
        settlementStatus: "unsettled",
        customer: order.customer,
        area: order.area,
        createdAt: new Date().toISOString(),
      };
    });
}

export function summarizeFinance(rows) {
  const cardRows = rows.filter((row) => row.paymentMethod === "card");
  const cashRows = rows.filter((row) => row.paymentMethod === "cash");
  const falajReceivableFromSuppliers = cashRows
    .filter((row) => row.cashCollectedBy === "supplier" || row.cashCollectedBy === "company_driver")
    .reduce((sum, row) => sum + row.falajCommissionAmount, 0);
  const supplierPayable = rows
    .filter((row) => row.paymentMethod === "card" || row.cashCollectedBy === "falaj_driver")
    .reduce((sum, row) => sum + row.supplierNetAmount, 0);

  return {
    totalSales: rows.reduce((sum, row) => sum + row.grossAmount, 0),
    cardSales: cardRows.reduce((sum, row) => sum + row.grossAmount, 0),
    cashSales: cashRows.reduce((sum, row) => sum + row.grossAmount, 0),
    falajCommission: rows.reduce((sum, row) => sum + row.falajCommissionAmount, 0),
    supplierPayable,
    falajReceivableFromSuppliers,
    netTransferAmount: supplierPayable - falajReceivableFromSuppliers,
  };
}

export function summarizeFinanceBySupplier(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const current = grouped.get(row.companyId) ?? {
      companyId: row.companyId,
      supplierName: row.supplierName,
      orderCount: 0,
      totalSales: 0,
      cashSales: 0,
      cardSales: 0,
      falajCommission: 0,
      supplierNet: 0,
      supplierOwesFalaj: 0,
      settlementStatus: row.settlementStatus,
    };

    current.orderCount += 1;
    current.totalSales += row.grossAmount;
    current.cashSales += row.paymentMethod === "cash" ? row.grossAmount : 0;
    current.cardSales += row.paymentMethod === "card" ? row.grossAmount : 0;
    current.falajCommission += row.falajCommissionAmount;
    current.supplierNet += row.supplierNetAmount;
    current.supplierOwesFalaj +=
      row.paymentMethod === "cash" &&
      (row.cashCollectedBy === "supplier" || row.cashCollectedBy === "company_driver")
        ? row.falajCommissionAmount
        : 0;
    grouped.set(row.companyId, current);
  });

  return Array.from(grouped.values());
}

export async function getFinancialRows(orders = mockOrders, suppliers = MOCK_SUPPLIERS) {
  if (!supabase) return buildFinancialRows(orders, suppliers);

  const { data, error } = await supabase
    .from("order_financials")
    .select(
      "id, order_id, company_id, gross_amount, payment_method, cash_collected_by, commission_rate, falaj_commission_amount, supplier_net_amount, settlement_status, created_at, companies(name)"
    )
    .order("created_at", { ascending: false });

  if (error) return buildFinancialRows(orders, suppliers);

  if (!data || data.length === 0) {
    return buildFinancialRows(orders, suppliers);
  }

  return data.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    companyId: row.company_id,
    supplierName: row.companies?.name ?? "مورد غير محدد",
    grossAmount: Number(row.gross_amount || 0),
    paymentMethod: row.payment_method,
    cashCollectedBy: row.cash_collected_by,
    commissionRate: Number(row.commission_rate || 0),
    falajCommissionAmount: Number(row.falaj_commission_amount || 0),
    supplierNetAmount: Number(row.supplier_net_amount || 0),
    settlementStatus: row.settlement_status,
    createdAt: row.created_at,
  }));
}
