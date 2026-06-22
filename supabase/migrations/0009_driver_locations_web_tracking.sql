-- Falaj Web - first safe stage for browser-based driver location sharing.
-- RLS is enabled; no public inserts are allowed.

create table if not exists driver_locations (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references drivers(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  latitude numeric not null,
  longitude numeric not null,
  accuracy numeric,
  recorded_at timestamptz not null default now(),
  source text not null default 'web',
  created_at timestamptz not null default now()
);

create index if not exists idx_driver_locations_driver_id_recorded_at
  on driver_locations(driver_id, recorded_at desc);

create index if not exists idx_driver_locations_company_id_recorded_at
  on driver_locations(company_id, recorded_at desc);

alter table driver_locations enable row level security;

drop policy if exists "driver locations admin read all via current user role" on driver_locations;
create policy "driver locations admin read all via current user role"
on driver_locations
for select
to authenticated
using (current_user_role() = 'admin');

drop policy if exists "company users can read own driver locations by owner_id" on driver_locations;
create policy "company users can read own driver locations by owner_id"
on driver_locations
for select
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = driver_locations.company_id
      and companies.owner_id = auth.uid()
  )
);

drop policy if exists "drivers can insert own web locations" on driver_locations;
create policy "drivers can insert own web locations"
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
      and (
        driver_locations.company_id is null
        or drivers.company_id = driver_locations.company_id
      )
  )
);
