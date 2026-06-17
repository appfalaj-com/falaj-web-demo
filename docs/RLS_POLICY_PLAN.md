# RLS Policy Plan

Checkpoint: `Falaj_SupabaseHosted_ProductionFoundation_20260615`

## Scope

This document describes the intended Row Level Security model for Falaj.

No RLS policies are implemented in this checkpoint.

The goal is to define safe access boundaries before connecting the frontend apps to hosted Supabase.

## Roles

Falaj has these logical roles:

- `customer`
- `company`
- `driver`
- `admin`
- public/anonymous visitor

The current schema has:

- `profiles.account_type`
- `companies.owner_id`
- `drivers.profile_id`

Future Auth model:

- `profiles.id` should equal `auth.users.id`.
- User role checks should read from `profiles.account_type`.
- Company ownership checks should use `companies.owner_id`.
- Driver identity checks should use `drivers.profile_id`.

## Public Users

Public users should only read marketplace-safe data:

- active companies
- active service areas, if needed for browsing
- available products from active companies

Public users must not read:

- customer profiles
- customer addresses
- orders
- driver location
- payment/cash status
- private company admin data

Example intended access:

- `companies`: read where `is_active = true`
- `products`: read where `is_available = true` and company is active

## Customer Access

Customers should see only their own data.

Allowed:

- read/update own `profiles` row
- read/create/update/delete own `addresses`
- read own `orders`
- create own `orders`
- read own `order_status_history` through their orders
- create/read own `ratings` for delivered orders

Not allowed:

- reading other customer profiles
- reading other customer addresses
- reading other customer orders
- updating company, driver, or admin-only fields
- directly changing order lifecycle status after creation

Key rule:

`orders.customer_id = auth.uid()`

## Company Owner Access

Company owners should see and manage only their company.

Allowed:

- read own company
- update safe own company fields
- read/create/update own company products
- read/create/update own service areas
- read/manage own drivers
- read own company orders
- company workflow actions for own orders:
  - accept
  - reject
  - assign driver

Not allowed:

- reading other companies' private orders
- managing other companies' products
- assigning drivers from another company
- editing customer profile data directly

Key rules:

- `companies.owner_id = auth.uid()`
- `products.company_id in companies owned by auth.uid()`
- `orders.company_id in companies owned by auth.uid()`
- `drivers.company_id in companies owned by auth.uid()`

## Driver Access

Drivers should see only orders assigned to them.

Allowed:

- read own driver row
- read assigned orders
- update allowed delivery status for assigned orders
- update cash collection fields only for assigned cash orders
- read necessary customer delivery snapshot/address for assigned order

Not allowed:

- seeing all company orders
- seeing unassigned orders
- assigning orders to self
- editing price/payment method/company fields
- seeing other drivers' orders

Key rule:

`orders.driver_id in drivers where drivers.profile_id = auth.uid()`

## Admin Access

Admins can see all operational data.

Allowed:

- read all profiles, companies, drivers, products, orders, ratings, and status history
- manage platform-level data
- investigate support cases

Admin policies must be explicit and based on:

`profiles.account_type = 'admin'`

Operational note:

- Keep admin access narrow to authenticated admin users only.
- Do not rely on frontend UI hiding as a security boundary.

## Table-by-table Policy Direction

### profiles

- user can read/update own profile
- admin can read all
- company owner/driver should not read arbitrary profiles except necessary snapshots are already stored on orders

### companies

- public can read active companies
- owner can read/update own company
- admin can read/update all

### products

- public can read available products for active companies
- company owner can manage products for own company
- admin can manage all

### service_areas

- public can read active service areas for active companies if needed
- company owner can manage own service areas
- admin can manage all

### drivers

- company owner can manage own company drivers
- driver can read own driver row
- admin can manage all
- public cannot read driver rows

### addresses

- customer can manage own addresses
- admin can read for support if needed
- company/driver should use order delivery snapshots rather than broad address access

### orders

- customer can read/create own orders
- company owner can read/manage own company orders
- driver can read/update assigned orders only
- admin can read/manage all

### order_status_history

- customer can read history for own orders
- company owner can read history for own company orders
- driver can read history for assigned orders
- admin can read all
- writes should be controlled by trusted functions or narrow policies

### ratings

- public may read aggregate rating later, not raw private rows by default
- customer can create rating for own delivered order
- company owner can read ratings for own company
- driver can read ratings tied to own driver profile if operationally needed
- admin can read all

## Recommended Implementation Approach

1. Add helper SQL functions:
   - `is_admin()`
   - `owns_company(company_id)`
   - `is_driver_for_order(order_id)`
   - `is_customer_for_order(order_id)`
2. Enable RLS gradually.
3. Start with read-only public policies for active companies/products.
4. Add customer policies.
5. Add company policies.
6. Add driver policies.
7. Add admin policies.
8. Test with real Supabase Auth users in each role.

## Important Warnings

- Do not connect frontend with anon key until RLS is active for private data.
- Do not expose service role key to browser or Expo.
- Do not let clients update sensitive order fields directly without policy checks.
- Consider using RPC/Edge Functions for critical transitions such as order assignment and payment/cash state.
