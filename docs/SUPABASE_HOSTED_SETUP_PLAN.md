# Supabase Hosted Setup Plan

Checkpoint: `Falaj_SupabaseHosted_ProductionFoundation_20260615`

## Scope

This plan prepares a hosted Supabase foundation for Falaj without connecting the current React apps yet.

Current apps:

- `Falaj_Web`: company, driver, and admin web dashboard.
- `Falaj_Claude`: customer marketplace app.

Current status:

- The apps still use mock/local state.
- Supabase is not connected.
- Payment is not connected.
- RLS is not enabled yet.

## Reviewed Files

Reviewed database draft files:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/seed.sql`

The schema currently includes:

- `profiles`
- `companies`
- `service_areas`
- `products`
- `drivers`
- `addresses`
- `orders`
- `order_status_history`
- `ratings`

The seed currently includes:

- one customer profile
- one company owner profile
- one driver profile
- one admin profile
- one company
- one service area
- four products
- one driver
- one customer address
- six sample orders
- sample order status history
- one rating

## Create Supabase Hosted Project

1. Sign in to Supabase.
2. Create a new project for the pilot/demo environment.
3. Choose a region close to Oman/GCC users when possible.
4. Store the project URL and anon key in a private password manager.
5. Do not copy the service role key into any frontend app or Vercel client-side variable.

Recommended project naming:

- `falaj-pilot`
- `falaj-demo`
- `falaj-production-foundation`

## Apply Schema

Recommended safe order:

1. Open Supabase SQL Editor.
2. Paste and run `supabase/migrations/0001_initial_schema.sql`.
3. Confirm all tables, enums, indexes, and triggers were created.
4. Confirm RLS is still not enabled unless a dedicated RLS migration is ready.

Important:

- This schema is still a foundation draft.
- `profiles.id` is intended to mirror `auth.users.id` later.
- Do not add `auth.users` foreign keys until the authentication plan is final.

## Apply Seed

For hosted pilot data:

1. Review `supabase/seed.sql`.
2. Confirm seed data is safe demo data only.
3. Run it after schema creation.
4. Confirm row counts in:
   - `profiles`
   - `companies`
   - `products`
   - `drivers`
   - `addresses`
   - `orders`
   - `order_status_history`
   - `ratings`

Important:

- The current seed contains demo/mock data.
- It should not be treated as production customer data.
- Before real production, replace demo rows with controlled pilot data.

## Storage Bucket

Create a Supabase Storage bucket:

`product-images`

Initial setup:

- Bucket name: `product-images`
- Purpose: product catalog images managed by companies.
- Current fields:
  - `products.image_url`
  - `products.image_path`

Recommended pilot approach:

- Keep product image reads public for available products.
- Delay company upload permissions until Auth and RLS are designed.
- For write access, later require the user to be a verified company owner/admin.

## Vercel Environment Variables

For `Falaj_Web` when read-only Supabase connection is added later:

Public frontend variables may include:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

For Expo/customer app later:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

These values are public client configuration:

- Supabase Project URL
- Supabase anon/public key

They are allowed in frontend builds only when RLS is correctly configured.

## Values That Must Never Be Put In Frontend

Never place these in React, Expo, Vercel frontend env vars, GitHub, or client bundles:

- Supabase service role key
- Database password
- JWT secret
- SMTP credentials
- Payment provider secret keys
- Any admin-only API keys
- Private storage signing keys

Service role key usage must be restricted to:

- trusted backend
- Supabase Edge Functions
- local private admin scripts
- CI/CD secrets when absolutely necessary

## Future RLS Plan

RLS must be enabled before the frontend reads real user/company/order data.

High-level plan:

1. Enable RLS table by table.
2. Start with public read policies for active companies and available products.
3. Add authenticated customer policies for own addresses and own orders.
4. Add company owner policies for own company, products, drivers, and orders.
5. Add driver policies for assigned driver orders only.
6. Add admin policies last and keep them explicit.

See:

`docs/RLS_POLICY_PLAN.md`

## Integration Plan After Hosted Setup

Recommended sequence:

1. Keep current mock workflow intact.
2. Add a Supabase client only after env vars are ready.
3. Start with read-only service functions.
4. Read companies and products first.
5. Keep order workflow mock until write actions and RLS are designed.
6. Add write actions in separate checkpoints:
   - customer order creation
   - company accept/reject
   - driver status updates
   - cash collection

## Pilot Warning

This setup is for Pilot/Demo foundation only.

Do not present the current version as full production until:

- RLS is implemented and tested.
- Privacy policy is published.
- Real payment/legal checks are completed.
- Data retention and access controls are approved.
- Operational support process is ready.
