-- Falaj Web - company driver management policies using companies.owner_id.
-- Suppliers can read, create, and update drivers for their own company only.

alter table drivers enable row level security;

grant select, insert, update on drivers to authenticated;

drop policy if exists "drivers read own company drivers by owner_id" on drivers;
create policy "drivers read own company drivers by owner_id"
on drivers
for select
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = drivers.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "drivers insert own company drivers by owner_id" on drivers;
create policy "drivers insert own company drivers by owner_id"
on drivers
for insert
to authenticated
with check (
  profile_id is null
  and exists (
    select 1
    from companies
    where companies.id = drivers.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "drivers update own company drivers by owner_id" on drivers;
create policy "drivers update own company drivers by owner_id"
on drivers
for update
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = drivers.company_id
      and companies.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from companies
    where companies.id = drivers.company_id
      and companies.owner_id = auth.uid()
  )
);
