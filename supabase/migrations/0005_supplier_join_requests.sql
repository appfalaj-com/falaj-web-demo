-- Falaj Web - supplier join requests.
-- Public visitors may submit requests, but public reads are not allowed.

create table if not exists supplier_join_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  phone text not null,
  email text not null,
  area text not null,
  service_type text not null,
  notes text,
  status text not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table supplier_join_requests
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

alter table supplier_join_requests
  alter column status set default 'pending';

update supplier_join_requests
set status = 'pending'
where status = 'new';

drop trigger if exists set_supplier_join_requests_updated_at on supplier_join_requests;
create trigger set_supplier_join_requests_updated_at
before update on supplier_join_requests
for each row execute function set_updated_at();

alter table supplier_join_requests enable row level security;

grant insert on supplier_join_requests to anon, authenticated;
grant select, update on supplier_join_requests to authenticated;

drop policy if exists "supplier join requests public insert" on supplier_join_requests;
create policy "supplier join requests public insert"
on supplier_join_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "supplier join requests admin read" on supplier_join_requests;
create policy "supplier join requests admin read"
on supplier_join_requests
for select
to authenticated
using (current_user_role() = 'admin');

drop policy if exists "supplier join requests admin update" on supplier_join_requests;
create policy "supplier join requests admin update"
on supplier_join_requests
for update
to authenticated
using (current_user_role() = 'admin')
with check (current_user_role() = 'admin');

create index if not exists idx_supplier_join_requests_created_at
  on supplier_join_requests(created_at desc);

create index if not exists idx_supplier_join_requests_status
  on supplier_join_requests(status);
