# Falaj Admin Finance Supplier Settlement Plan

## Scope

This phase is implemented only in `Falaj_Web`. It does not modify `Falaj_Claude`, Cart, Checkout, or Payment.

## Admin Permissions

Admin access is based on Supabase Auth plus:

- `profiles.role = 'admin'`
- fallback: `profiles.account_type = 'admin'`

Admin routes are protected in the React app and reinforced by RLS policies. The frontend never uses a `service_role` key.

Protected admin pages:

- `/admin`
- `/admin/suppliers`
- `/admin/finance`
- `/admin/suppliers/:companyId/account`
- `/admin/live-tracking`

## Supplier Approval

`companies.status` controls supplier access:

- `pending`: قيد المراجعة
- `approved`: معتمد
- `rejected`: مرفوض
- `suspended`: موقوف

Only `approved` suppliers can enter the company dashboard. Other statuses show:

`حسابكم قيد المراجعة من إدارة فلج`

The legacy `companies.is_active` remains for compatibility and is synchronized by admin status updates in the UI.

## Bank And Commission Fields

The migration adds these fields to `companies`:

- `bank_name`
- `bank_account_name`
- `bank_account_number`
- `iban`
- `commission_rate`
- `status`

Commission is stored per supplier so finance rows can preserve the rate used at the time of calculation.

## Commission Calculation

`order_financials` stores one financial row per delivered order.

Rules:

- No duplicate financial row for the same `order_id`.
- Rows should be created only for `orders.status = 'delivered'`.
- `falaj_commission_amount = gross_amount * commission_rate / 100`
- `supplier_net_amount = gross_amount - falaj_commission_amount`

## Cash vs Card

If `payment_method = card`:

- Falaj received the full gross amount.
- Supplier is owed `supplier_net_amount`.
- Falaj keeps `falaj_commission_amount`.

If `payment_method = cash` and `cash_collected_by = supplier` or `company_driver`:

- Supplier or company driver received the full gross amount.
- Supplier owes Falaj `falaj_commission_amount`.

If `payment_method = cash` and `cash_collected_by = falaj_driver`:

- Falaj received the full gross amount.
- Supplier is owed `supplier_net_amount`.

## Settlements

Tables:

- `supplier_settlements`
- `settlement_items`

Settlement rules:

- Use only `order_financials.settlement_status = 'unsettled'`.
- Link financial rows through `settlement_items`.
- Change rows to `included` when a settlement draft is created.
- Change rows to `settled` when payment is confirmed in a later payment-confirmation workflow.
- `settlement_items.order_financial_id` is unique to prevent settling the same financial row twice.

## RLS

Admin can read/manage suppliers, orders, drivers, products, finance, and settlements.

Company users can read only their own company-scoped data.

Drivers can read their assigned orders and schedule rows.

Financial tables are editable only by admin policies or security-definer functions. Company users get read-only access to their own financial and settlement rows.

## Current UI State

The UI is ready with safe fallback data when Supabase tables are empty:

- `/admin`: dashboard metrics
- `/admin/suppliers`: supplier review and status management
- `/admin/finance`: financial summary by supplier
- `/admin/suppliers/:companyId/account`: supplier account and financial rows with date filters

Actual production settlement approval/payment should be added after finance operations confirm the accounting workflow.
