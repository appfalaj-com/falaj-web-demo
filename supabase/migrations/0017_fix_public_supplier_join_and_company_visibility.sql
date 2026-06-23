-- Falaj Web - fix public supplier join insert and public catalog visibility.
-- Scope: supplier_join_requests, companies, and unsafe public products policy only.

alter table supplier_join_requests enable row level security;
alter table companies enable row level security;
alter table products enable row level security;

-- Public visitors may submit supplier join requests, but may not read/update/delete them.
grant insert on supplier_join_requests to anon, authenticated;
revoke select, update, delete, truncate on supplier_join_requests from anon;
grant select, update on supplier_join_requests to authenticated;

drop policy if exists "supplier join requests public insert" on supplier_join_requests;
drop policy if exists "supplier join requests admin read" on supplier_join_requests;
drop policy if exists "supplier join requests admin update" on supplier_join_requests;
drop policy if exists "supplier join requests admin delete" on supplier_join_requests;

create policy "supplier join requests public insert"
on supplier_join_requests
for insert
to anon, authenticated
with check (true);

create policy "supplier join requests admin read"
on supplier_join_requests
for select
to authenticated
using (current_user_role() = 'admin');

create policy "supplier join requests admin update"
on supplier_join_requests
for update
to authenticated
using (current_user_role() = 'admin')
with check (current_user_role() = 'admin');

create policy "supplier join requests admin delete"
on supplier_join_requests
for delete
to authenticated
using (current_user_role() = 'admin');

-- Keep SELECT grant because products public policy uses companies in EXISTS.
-- Remove public company row visibility by dropping anon SELECT policies instead.
grant select on companies to anon;
revoke insert, update, delete, truncate on companies from anon;
grant select, insert, update on companies to authenticated;

drop policy if exists "public_read_active_companies" on companies;
drop policy if exists "companies public read" on companies;
drop policy if exists "companies public read active companies" on companies;
drop policy if exists "companies public read approved companies" on companies;
drop policy if exists "companies public read active approved companies" on companies;
drop policy if exists "companies read active approved public" on companies;
drop policy if exists "companies read active companies" on companies;
drop policy if exists "public can read active companies" on companies;
drop policy if exists "public read companies" on companies;
drop policy if exists "public read active companies" on companies;

drop policy if exists "Company users can read own company by owner_id" on companies;
drop policy if exists "companies admin manage all via current user role" on companies;

create policy "Company users can read own company by owner_id"
on companies
for select
to authenticated
using (
  owner_id = auth.uid()
  or current_user_role() = 'admin'
);

create policy "companies admin manage all via current user role"
on companies
for all
to authenticated
using (current_user_role() = 'admin')
with check (current_user_role() = 'admin');

-- Remove unsafe public products policy. Keep the stricter approved/visible/active-company policy.
drop policy if exists "public_read_available_products" on products;
drop policy if exists "products public read available products" on products;

grant select on products to anon;
revoke insert, update, delete, truncate on products from anon;
