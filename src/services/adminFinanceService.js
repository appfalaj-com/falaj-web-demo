import { supabase } from "../lib/supabaseClient.js";

const STATUS_LABELS = {
  pending: "قيد الإعداد",
  approved: "نشط",
  rejected: "غير نشط",
  suspended: "موقوف",
};

const COMPANY_SELECT_COLUMNS = [
  "id",
  "name",
  "phone",
  "email",
  "is_active",
  "commission_rate",
  "created_at",
  "onboarding_status",
].join(",");

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
    status: resolveCompanyStatus(company),
    commissionRate: Number(company.commission_rate ?? 0),
    createdAt: company.created_at,
    bankName: company.bank_name ?? "",
    bankAccountName: company.bank_account_name ?? "",
    bankAccountNumber: company.bank_account_number ?? "",
    iban: company.iban ?? "",
  };
}

function resolveCompanyStatus(company) {
  if (company.is_active) return "approved";
  if (company.onboarding_status === "suspended") return "suspended";
  if (company.onboarding_status === "rejected") return "rejected";
  return "pending";
}

export async function getSuppliers() {
  if (!supabase) {
    throw new Error("Supabase غير مفعّل حاليًا.");
  }

  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_SELECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeCompany);
}

export async function updateSupplierStatus(companyId, status) {
  if (!supabase) {
    throw new Error("Supabase غير مفعّل حاليًا.");
  }

  const patch =
    status === "approved"
      ? { is_active: true, onboarding_status: "activated" }
      : { is_active: false, onboarding_status: status === "pending" ? "pending_setup" : status };

  const { data, error } = await supabase
    .from("companies")
    .update(patch)
    .eq("id", companyId)
    .select(COMPANY_SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return normalizeCompany(data);
}

export async function updateSupplierCommission(companyId, commissionRate) {
  if (!supabase) {
    throw new Error("Supabase غير مفعّل حاليًا.");
  }

  const { data, error } = await supabase
    .from("companies")
    .update({ commission_rate: commissionRate })
    .eq("id", companyId)
    .select(COMPANY_SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return normalizeCompany(data);
}

export async function getFinancialRows() {
  if (!supabase) {
    throw new Error("Supabase غير مفعّل حاليًا.");
  }

  const { data, error } = await supabase
    .from("order_financials")
    .select(
      "id, order_id, company_id, gross_amount, payment_method, cash_collected_by, commission_rate, falaj_commission_amount, supplier_net_amount, settlement_status, created_at, companies(name)"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
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
