-- Falaj Web - company auth and company-scoped RLS.
-- Adds auth.users ownership without removing the legacy owner_id/profile model.

alter table profiles
  add column if not exists role account_type;

update profiles
set role = account_type
where role is null;

alter table profiles
  alter column role set default 'customer'::account_type;

alter table companies
  add column if not exists owner_user_id uuid;

update companies
set owner_user_id = owner_id
where owner_user_id is null
  and owner_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_owner_user_id_fkey'
  ) then
    alter table companies
      add constraint companies_owner_user_id_fkey
      foreign key (owner_user_id)
      references auth.users(id)
      on delete set null
      not valid;
  end if;
end $$;

create index if not exists idx_companies_owner_user_id on companies(owner_user_id);
create index if not exists idx_profiles_role on profiles(role);

alter table profiles enable row level security;
alter table companies enable row level security;
alter table orders enable row level security;
alter table drivers enable row level security;
alter table products enable row level security;

drop policy if exists "profiles read own profile" on profiles;
drop policy if exists "profiles update own profile" on profiles;

create policy "profiles read own profile"
on profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles update own profile"
on profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "companies read own company" on companies;
drop policy if exists "companies update own company" on companies;
drop policy if exists "companies insert own company" on companies;

create policy "companies read own company"
on companies
for select
to authenticated
using (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and coalesce(profiles.role, profiles.account_type) = 'company'::account_type
  )
);

create policy "companies update own company"
on companies
for update
to authenticated
using (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and coalesce(profiles.role, profiles.account_type) = 'company'::account_type
  )
)
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and coalesce(profiles.role, profiles.account_type) = 'company'::account_type
  )
);

create policy "companies insert own company"
on companies
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and coalesce(profiles.role, profiles.account_type) = 'company'::account_type
  )
);

drop policy if exists "orders read own company orders" on orders;
drop policy if exists "orders update own company orders" on orders;
drop policy if exists "orders customers read own orders" on orders;
drop policy if exists "orders customers insert own orders" on orders;

create policy "orders read own company orders"
on orders
for select
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = orders.company_id
      and companies.owner_user_id = auth.uid()
  )
);

create policy "orders update own company orders"
on orders
for update
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = orders.company_id
      and companies.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from companies
    where companies.id = orders.company_id
      and companies.owner_user_id = auth.uid()
  )
);

create policy "orders customers read own orders"
on orders
for select
to authenticated
using (customer_id = auth.uid());

create policy "orders customers insert own orders"
on orders
for insert
to authenticated
with check (customer_id = auth.uid());

drop policy if exists "drivers read own company drivers" on drivers;
drop policy if exists "drivers insert own company drivers" on drivers;
drop policy if exists "drivers update own company drivers" on drivers;
drop policy if exists "drivers delete own company drivers" on drivers;

create policy "drivers read own company drivers"
on drivers
for select
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = drivers.company_id
      and companies.owner_user_id = auth.uid()
  )
);

create policy "drivers insert own company drivers"
on drivers
for insert
to authenticated
with check (
  exists (
    select 1
    from companies
    where companies.id = drivers.company_id
      and companies.owner_user_id = auth.uid()
  )
);

create policy "drivers update own company drivers"
on drivers
for update
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = drivers.company_id
      and companies.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from companies
    where companies.id = drivers.company_id
      and companies.owner_user_id = auth.uid()
  )
);

create policy "drivers delete own company drivers"
on drivers
for delete
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = drivers.company_id
      and companies.owner_user_id = auth.uid()
  )
);

drop policy if exists "products public read available products" on products;
drop policy if exists "products read own company products" on products;
drop policy if exists "products insert own company products" on products;
drop policy if exists "products update own company products" on products;
drop policy if exists "products delete own company products" on products;

create policy "products public read available products"
on products
for select
to anon, authenticated
using (is_available = true);

create policy "products read own company products"
on products
for select
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.owner_user_id = auth.uid()
  )
);

create policy "products insert own company products"
on products
for insert
to authenticated
with check (
  exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.owner_user_id = auth.uid()
  )
);

create policy "products update own company products"
on products
for update
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.owner_user_id = auth.uid()
  )
);

create policy "products delete own company products"
on products
for delete
to authenticated
using (
  exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.owner_user_id = auth.uid()
  )
);
