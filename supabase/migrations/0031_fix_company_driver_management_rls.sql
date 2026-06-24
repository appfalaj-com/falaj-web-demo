-- Falaj Web - fix supplier driver management RLS.
-- Scope: drivers table only.
-- Suppliers may read/create/update operational driver records for their own company.

alter table public.drivers enable row level security;

revoke all on public.drivers from anon;
grant select, insert, update on public.drivers to authenticated;

drop policy if exists "drivers read own company drivers" on public.drivers;
drop policy if exists "drivers insert own company drivers" on public.drivers;
drop policy if exists "drivers update own company drivers" on public.drivers;
drop policy if exists "drivers delete own company drivers" on public.drivers;

drop policy if exists "drivers read own company drivers by owner_id" on public.drivers;
drop policy if exists "drivers insert own company drivers by owner_id" on public.drivers;
drop policy if exists "drivers update own company drivers by owner_id" on public.drivers;

create policy "drivers read own company drivers by owner_id"
on public.drivers
for select
to authenticated
using (
  exists (
    select 1
    from public.companies c
    where c.id = drivers.company_id
      and c.owner_id = auth.uid()
  )
);

create policy "drivers insert own company drivers by owner_id"
on public.drivers
for insert
to authenticated
with check (
  profile_id is null
  and exists (
    select 1
    from public.companies c
    where c.id = drivers.company_id
      and c.owner_id = auth.uid()
  )
);

create policy "drivers update own company drivers by owner_id"
on public.drivers
for update
to authenticated
using (
  exists (
    select 1
    from public.companies c
    where c.id = drivers.company_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies c
    where c.id = drivers.company_id
      and c.owner_id = auth.uid()
  )
);
