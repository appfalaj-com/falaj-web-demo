-- Falaj Web - product catalog moderation workflow.
-- Products are hidden from customer-facing catalogs until approved by an admin.

alter table products
  add column if not exists approval_status text not null default 'pending_review',
  add column if not exists admin_review_notes text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists is_visible boolean not null default false;

update products
set approval_status = 'pending_review',
    is_visible = false
where approval_status is null;

alter table products
  drop constraint if exists products_approval_status_check;

alter table products
  add constraint products_approval_status_check
  check (approval_status in ('pending_review', 'approved', 'rejected', 'hidden'));

create index if not exists idx_products_approval_status on products(approval_status);
create index if not exists idx_products_is_visible on products(is_visible);

alter table products enable row level security;

drop policy if exists "products public read available products" on products;
create policy "products public read approved visible products"
on products
for select
to anon, authenticated
using (
  is_available = true
  and approval_status = 'approved'
  and is_visible = true
  and exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.is_active = true
      and companies.onboarding_status = 'activated'
  )
);

drop policy if exists "products admin manage moderation" on products;
create policy "products admin manage moderation"
on products
for all
to authenticated
using (current_user_role() = 'admin')
with check (current_user_role() = 'admin');

drop policy if exists "company users read own products by owner_id" on products;
create policy "company users read own products by owner_id"
on products
for select
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "company users insert own products pending review" on products;
create policy "company users insert own products pending review"
on products
for insert
to authenticated
with check (
  approval_status = 'pending_review'
  and is_visible = false
  and exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "company users update own products pending review" on products;
create policy "company users update own products pending review"
on products
for update
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.owner_id = auth.uid()
  )
)
with check (
  approval_status = 'pending_review'
  and is_visible = false
  and exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.owner_id = auth.uid()
  )
);
