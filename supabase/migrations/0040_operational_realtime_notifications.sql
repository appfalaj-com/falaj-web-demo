-- Falaj Web - realtime operational notifications.
-- Publish actionable tables and let active drivers receive available orders
-- from their own company through RLS-protected Realtime changes.

alter table public.orders replica identity full;
alter table public.products replica identity full;
alter table public.supplier_join_requests replica identity full;

do $$
declare
  table_name text;
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    return;
  end if;

  foreach table_name in array array[
    'orders',
    'products',
    'supplier_join_requests'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end;
$$;

drop policy if exists "driver users can read company available orders" on public.orders;
create policy "driver users can read company available orders"
on public.orders
for select
to authenticated
using (
  orders.driver_id is null
  and orders.status in ('pending', 'accepted')
  and exists (
    select 1
    from public.drivers
    where drivers.profile_id = auth.uid()
      and drivers.is_active = true
      and drivers.company_id = orders.company_id
  )
);
