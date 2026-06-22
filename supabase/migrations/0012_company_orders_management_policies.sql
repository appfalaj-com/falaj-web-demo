-- Falaj Web - company order management policies using companies.owner_id.
-- Allows suppliers to read/update only their own orders and write status history.

alter table orders enable row level security;
alter table order_status_history enable row level security;

grant select, update on orders to authenticated;
grant select, insert on order_status_history to authenticated;

drop policy if exists "orders read own company orders by owner_id" on orders;
create policy "orders read own company orders by owner_id"
on orders
for select
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = orders.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "orders update own company orders by owner_id" on orders;
create policy "orders update own company orders by owner_id"
on orders
for update
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = orders.company_id
      and companies.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from companies
    where companies.id = orders.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "company users read own order status history" on order_status_history;
create policy "company users read own order status history"
on order_status_history
for select
to authenticated
using (
  exists (
    select 1
    from orders
    join companies on companies.id = orders.company_id
    where orders.id = order_status_history.order_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "company users insert own order status history" on order_status_history;
create policy "company users insert own order status history"
on order_status_history
for insert
to authenticated
with check (
  changed_by_profile_id = auth.uid()
  and exists (
    select 1
    from orders
    join companies on companies.id = orders.company_id
    where orders.id = order_status_history.order_id
      and companies.owner_id = auth.uid()
  )
);
