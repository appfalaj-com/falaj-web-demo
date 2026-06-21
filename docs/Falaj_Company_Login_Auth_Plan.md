# Falaj Company Login Auth Plan

## Scope

This change only touches `Falaj_Web`. It does not modify `Falaj_Claude`, Cart, Checkout, or Payment.

## Routes

- `/company/login`: Arabic RTL supplier/company login page.
- `/company`: protected company dashboard.
- `/company/orders`: protected company orders page.
- `/company/drivers`: protected company drivers page.

## Login Methods

Email login uses Supabase Auth:

- `supabase.auth.signInWithPassword({ email, password })`
- After success, the app reads the current `profiles` row.
- The account must have `role = 'company'`.
- For compatibility with the current schema, the app also accepts the existing `account_type = 'company'` while the new migration backfills `profiles.role`.

Phone login uses Supabase Auth OTP:

- `supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } })`
- The app then shows an OTP code screen.
- Verification uses `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
- If SMS/phone auth is not enabled in Supabase, the UI shows:
  - `الدخول بالهاتف غير مفعل حاليًا. يرجى استخدام الدخول بالإيميل أو التواصل مع إدارة فلج.`

## Authorization Rules

After login:

1. Read the current Supabase Auth session.
2. Read `profiles` where `profiles.id = auth.users.id`.
3. Require `role = 'company'` or legacy `account_type = 'company'`.
4. Read `companies` where `owner_user_id = auth.users.id`.
5. If no linked company exists, block access.
6. If `companies.is_active = false`, show:
   - `حسابكم قيد المراجعة من إدارة فلج`

If a logged-in user is not a company user, the UI blocks access with:

`هذا الحساب غير مصرح له بالدخول إلى لوحة الموردين`

## Database Migration

Migration file:

`supabase/migrations/0002_company_auth_rls.sql`

It adds:

- `profiles.role account_type`
- `companies.owner_user_id uuid`
- `idx_companies_owner_user_id`
- `idx_profiles_role`

It backfills:

- `profiles.role` from `profiles.account_type`
- `companies.owner_user_id` from legacy `companies.owner_id`

The foreign key to `auth.users(id)` is added as `not valid` so existing demo rows are not broken if the matching Auth users do not exist yet.

## RLS Summary

RLS is enabled on:

- `profiles`
- `companies`
- `orders`
- `drivers`
- `products`

Company policies:

- A company user can read/update only the company where `companies.owner_user_id = auth.uid()`.
- A company user can read/update only orders whose `orders.company_id` belongs to that user.
- A company user can read/insert/update/delete only drivers whose `drivers.company_id` belongs to that user.
- A company user can manage only products whose `products.company_id` belongs to that user.

Customer-safe policies are included for orders/products:

- Authenticated customers can read/insert their own orders by `customer_id = auth.uid()`.
- Public users can still read available products, preserving the customer marketplace path.

## Activation Checklist

1. Apply `0002_company_auth_rls.sql` in Supabase.
2. Ensure each company owner has an Auth user.
3. Ensure `profiles.id` equals the Auth user id.
4. Ensure `profiles.role = 'company'`.
5. Ensure `companies.owner_user_id` equals the Auth user id.
6. Enable Email Auth in Supabase.
7. Enable Phone/SMS Auth only when an SMS provider is configured.
8. Test login with a company account, a customer account, and an inactive company.

## Safety Notes

- The legacy `owner_id` and `account_type` fields remain in place.
- Demo data is not deleted or rewritten beyond safe backfills.
- The React app falls back to existing mock data when Supabase data is unavailable.
