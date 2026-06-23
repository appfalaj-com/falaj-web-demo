-- Falaj Web - cash orders foundation.
-- Scope:
-- 1. Remove demo/public order access policies.
-- 2. Lock anon grants for order and driver runtime tables.
-- 3. Add order_items with read-only RLS for admin, owning supplier, and assigned driver.

alter table public.orders enable row level security;
alter table public.order_status_history enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_locations enable row level security;

drop policy if exists "demo_public_read_orders" on public.orders;
drop policy if exists "orders_insert_customer_demo_anon" on public.orders;
drop policy if exists "orders_select_customer_demo_anon" on public.orders;

revoke all on public.orders from anon;
revoke all on public.order_status_history from anon;
revoke all on public.drivers from anon;
revoke all on public.driver_locations from anon;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete restrict,
  product_name_snapshot text not null,
  unit_price numeric not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_company_id on public.order_items(company_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

alter table public.order_items enable row level security;

revoke all on public.order_items from anon;
grant select on public.order_items to authenticated;

drop policy if exists "order items admin read all" on public.order_items;
drop policy if exists "order items company read own" on public.order_items;
drop policy if exists "order items driver read assigned" on public.order_items;

create policy "order items admin read all"
on public.order_items
for select
to authenticated
using (current_user_role() = 'admin');

create policy "order items company read own"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.companies c
    where c.id = order_items.company_id
      and c.owner_id = auth.uid()
  )
);

create policy "order items driver read assigned"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.drivers d on d.id = o.driver_id
    where o.id = order_items.order_id
      and d.profile_id = auth.uid()
  )
);
