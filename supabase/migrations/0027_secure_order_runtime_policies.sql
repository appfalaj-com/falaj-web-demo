-- Falaj Web - runtime RLS for cash orders.
-- Restores real authenticated access after removing demo public order policies.
-- No anon access is granted here.

alter table public.orders enable row level security;
alter table public.order_status_history enable row level security;

revoke all on public.orders from anon;
revoke all on public.order_status_history from anon;

grant select, update on public.orders to authenticated;
grant select, insert on public.order_status_history to authenticated;

drop policy if exists "orders admin manage all" on public.orders;
drop policy if exists "orders company read own" on public.orders;
drop policy if exists "orders company update own" on public.orders;
drop policy if exists "orders driver read assigned" on public.orders;
drop policy if exists "orders driver update assigned" on public.orders;
drop policy if exists "orders customer read own" on public.orders;

create policy "orders admin manage all"
on public.orders
for all
to authenticated
using (current_user_role() = 'admin')
with check (current_user_role() = 'admin');

create policy "orders company read own"
on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.companies c
    where c.id = orders.company_id
      and c.owner_id = auth.uid()
  )
);

create policy "orders company update own"
on public.orders
for update
to authenticated
using (
  exists (
    select 1
    from public.companies c
    where c.id = orders.company_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies c
    where c.id = orders.company_id
      and c.owner_id = auth.uid()
  )
);

create policy "orders driver read assigned"
on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.drivers d
    where d.id = orders.driver_id
      and d.profile_id = auth.uid()
      and d.is_active = true
  )
);

create policy "orders driver update assigned"
on public.orders
for update
to authenticated
using (
  exists (
    select 1
    from public.drivers d
    where d.id = orders.driver_id
      and d.profile_id = auth.uid()
      and d.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.drivers d
    where d.id = orders.driver_id
      and d.profile_id = auth.uid()
      and d.is_active = true
  )
);

create policy "orders customer read own"
on public.orders
for select
to authenticated
using (customer_id = auth.uid());

drop policy if exists "order status history admin read all" on public.order_status_history;
drop policy if exists "order status history related users read" on public.order_status_history;
drop policy if exists "order status history related users insert" on public.order_status_history;

create policy "order status history admin read all"
on public.order_status_history
for select
to authenticated
using (current_user_role() = 'admin');

create policy "order status history related users read"
on public.order_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    left join public.companies c on c.id = o.company_id
    left join public.drivers d on d.id = o.driver_id
    where o.id = order_status_history.order_id
      and (
        o.customer_id = auth.uid()
        or c.owner_id = auth.uid()
        or d.profile_id = auth.uid()
      )
  )
);

create policy "order status history related users insert"
on public.order_status_history
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders o
    left join public.companies c on c.id = o.company_id
    left join public.drivers d on d.id = o.driver_id
    where o.id = order_status_history.order_id
      and (
        current_user_role() = 'admin'
        or c.owner_id = auth.uid()
        or d.profile_id = auth.uid()
        or o.customer_id = auth.uid()
      )
  )
);
