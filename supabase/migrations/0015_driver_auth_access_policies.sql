-- Falaj Web - safe driver auth access policies.
-- A driver can only read their own driver row, save their own location,
-- read/update orders assigned to them, and add status history for those orders.

alter table drivers enable row level security;
alter table driver_locations enable row level security;
alter table orders enable row level security;
alter table order_status_history enable row level security;

grant select on drivers to authenticated;
grant select, insert on driver_locations to authenticated;
grant select, update on orders to authenticated;
grant select, insert on order_status_history to authenticated;

drop policy if exists "driver users can read own driver row" on drivers;
create policy "driver users can read own driver row"
on drivers
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "driver users can read own locations" on driver_locations;
create policy "driver users can read own locations"
on driver_locations
for select
to authenticated
using (
  exists (
    select 1
    from drivers
    where drivers.id = driver_locations.driver_id
      and drivers.profile_id = auth.uid()
  )
);

drop policy if exists "driver users can insert own active web locations" on driver_locations;
create policy "driver users can insert own active web locations"
on driver_locations
for insert
to authenticated
with check (
  source = 'web'
  and exists (
    select 1
    from drivers
    where drivers.id = driver_locations.driver_id
      and drivers.profile_id = auth.uid()
      and drivers.is_active = true
      and drivers.company_id = driver_locations.company_id
  )
);

drop policy if exists "driver users can read assigned orders" on orders;
create policy "driver users can read assigned orders"
on orders
for select
to authenticated
using (
  exists (
    select 1
    from drivers
    where drivers.id = orders.driver_id
      and drivers.profile_id = auth.uid()
      and drivers.is_active = true
  )
);

drop policy if exists "driver users can update assigned order status" on orders;
create policy "driver users can update assigned order status"
on orders
for update
to authenticated
using (
  exists (
    select 1
    from drivers
    where drivers.id = orders.driver_id
      and drivers.profile_id = auth.uid()
      and drivers.is_active = true
  )
)
with check (
  status in ('en_route', 'arrived', 'delivered', 'failed')
  and exists (
    select 1
    from drivers
    where drivers.id = orders.driver_id
      and drivers.profile_id = auth.uid()
      and drivers.is_active = true
  )
);

drop policy if exists "driver users can read assigned order history" on order_status_history;
create policy "driver users can read assigned order history"
on order_status_history
for select
to authenticated
using (
  exists (
    select 1
    from orders
    join drivers on drivers.id = orders.driver_id
    where orders.id = order_status_history.order_id
      and drivers.profile_id = auth.uid()
      and drivers.is_active = true
  )
);

drop policy if exists "driver users can insert assigned order history" on order_status_history;
create policy "driver users can insert assigned order history"
on order_status_history
for insert
to authenticated
with check (
  changed_by_profile_id = auth.uid()
  and status in ('en_route', 'arrived', 'delivered', 'failed')
  and exists (
    select 1
    from orders
    join drivers on drivers.id = orders.driver_id
    where orders.id = order_status_history.order_id
      and drivers.profile_id = auth.uid()
      and drivers.is_active = true
  )
);
