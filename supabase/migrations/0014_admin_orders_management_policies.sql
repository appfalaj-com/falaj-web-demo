-- Falaj Web - admin order management policies.
-- Admins can read/update all orders and read/insert status history.

alter table orders enable row level security;
alter table order_status_history enable row level security;

grant select, update on orders to authenticated;
grant select, insert on order_status_history to authenticated;

drop policy if exists "orders admin read all by role" on orders;
create policy "orders admin read all by role"
on orders
for select
to authenticated
using (current_user_role() = 'admin');

drop policy if exists "orders admin update all by role" on orders;
create policy "orders admin update all by role"
on orders
for update
to authenticated
using (current_user_role() = 'admin')
with check (current_user_role() = 'admin');

drop policy if exists "admin read all order status history" on order_status_history;
create policy "admin read all order status history"
on order_status_history
for select
to authenticated
using (current_user_role() = 'admin');

drop policy if exists "admin insert order status history" on order_status_history;
create policy "admin insert order status history"
on order_status_history
for insert
to authenticated
with check (
  current_user_role() = 'admin'
  and changed_by_profile_id = auth.uid()
);
