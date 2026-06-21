-- Falaj Web - admin, supplier finance, settlements, and tracking foundation.
-- Safe additive migration after 0002_company_auth_rls.sql.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'supplier_status') then
    create type supplier_status as enum ('pending', 'approved', 'rejected', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'cash_collected_by_type') then
    create type cash_collected_by_type as enum ('supplier', 'falaj_driver', 'company_driver');
  end if;

  if not exists (select 1 from pg_type where typname = 'settlement_status') then
    create type settlement_status as enum ('unsettled', 'included', 'settled');
  end if;

  if not exists (select 1 from pg_type where typname = 'supplier_settlement_status') then
    create type supplier_settlement_status as enum ('draft', 'approved', 'paid', 'cancelled');
  end if;
end $$;

create or replace function current_user_role()
returns account_type
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(role, account_type)
  from profiles
  where id = auth.uid()
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select current_user_role() = 'admin'::account_type
$$;

create or replace function is_company_owner(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from companies
    where id = target_company_id
      and owner_user_id = auth.uid()
      and coalesce(status, case when is_active then 'approved'::supplier_status else 'pending'::supplier_status end) = 'approved'::supplier_status
  )
$$;

alter table companies
  add column if not exists bank_name text,
  add column if not exists bank_account_name text,
  add column if not exists bank_account_number text,
  add column if not exists iban text,
  add column if not exists commission_rate numeric(5, 2) not null default 0 check (commission_rate >= 0 and commission_rate <= 100),
  add column if not exists status supplier_status;

update companies
set status = case when is_active then 'approved'::supplier_status else 'pending'::supplier_status end
where status is null;

alter table companies
  alter column status set default 'pending'::supplier_status;

create index if not exists idx_companies_status on companies(status);

create table if not exists order_financials (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  gross_amount numeric(10, 3) not null check (gross_amount >= 0),
  payment_method payment_method not null,
  cash_collected_by cash_collected_by_type,
  commission_rate numeric(5, 2) not null check (commission_rate >= 0 and commission_rate <= 100),
  falaj_commission_amount numeric(10, 3) generated always as ((gross_amount * commission_rate / 100.0)) stored,
  supplier_net_amount numeric(10, 3) generated always as ((gross_amount - (gross_amount * commission_rate / 100.0))) stored,
  settlement_status settlement_status not null default 'unsettled',
  created_at timestamptz not null default now(),
  unique (order_id)
);

create index if not exists idx_order_financials_company_id on order_financials(company_id);
create index if not exists idx_order_financials_settlement_status on order_financials(settlement_status);

create table if not exists supplier_settlements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  gross_sales numeric(10, 3) not null default 0,
  card_sales numeric(10, 3) not null default 0,
  cash_sales numeric(10, 3) not null default 0,
  falaj_commission_total numeric(10, 3) not null default 0,
  supplier_payable numeric(10, 3) not null default 0,
  supplier_owes_falaj numeric(10, 3) not null default 0,
  net_transfer_amount numeric(10, 3) not null default 0,
  status supplier_settlement_status not null default 'draft',
  transfer_reference text,
  transfer_date date,
  notes text,
  created_at timestamptz not null default now(),
  constraint supplier_settlements_period_check check (period_end >= period_start)
);

create index if not exists idx_supplier_settlements_company_id on supplier_settlements(company_id);
create index if not exists idx_supplier_settlements_status on supplier_settlements(status);

create table if not exists settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references supplier_settlements(id) on delete cascade,
  order_financial_id uuid not null references order_financials(id) on delete restrict,
  gross_amount numeric(10, 3) not null,
  falaj_commission_amount numeric(10, 3) not null,
  supplier_net_amount numeric(10, 3) not null,
  unique (order_financial_id)
);

create index if not exists idx_settlement_items_settlement_id on settlement_items(settlement_id);

create table if not exists driver_locations (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  latitude numeric(10, 7) not null check (latitude between -90 and 90),
  longitude numeric(10, 7) not null check (longitude between -180 and 180),
  accuracy numeric(8, 2),
  heading numeric(8, 2),
  speed numeric(8, 2),
  battery_level numeric(5, 2),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_driver_locations_driver_id on driver_locations(driver_id);
create index if not exists idx_driver_locations_company_id on driver_locations(company_id);
create index if not exists idx_driver_locations_order_id on driver_locations(order_id);

create table if not exists driver_delivery_schedule (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  scheduled_date date not null,
  scheduled_time_from time,
  scheduled_time_to time,
  sequence_number int,
  status text not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_driver_delivery_schedule_driver_id on driver_delivery_schedule(driver_id);
create index if not exists idx_driver_delivery_schedule_company_id on driver_delivery_schedule(company_id);
create index if not exists idx_driver_delivery_schedule_order_id on driver_delivery_schedule(order_id);

alter table orders
  add column if not exists delivery_status text,
  add column if not exists picked_up_at timestamptz,
  add column if not exists on_the_way_at timestamptz,
  add column if not exists estimated_arrival_minutes int,
  add column if not exists last_driver_location_id uuid references driver_locations(id) on delete set null;

create index if not exists idx_orders_delivery_status on orders(delivery_status);
create index if not exists idx_orders_last_driver_location_id on orders(last_driver_location_id);

create or replace function create_order_financial_for_delivered(target_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order orders%rowtype;
  target_company companies%rowtype;
  financial_id uuid;
begin
  select * into target_order
  from orders
  where id = target_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  if target_order.status <> 'delivered'::order_status then
    raise exception 'Financial rows can only be created for delivered orders';
  end if;

  select * into target_company
  from companies
  where id = target_order.company_id;

  insert into order_financials (
    order_id,
    company_id,
    gross_amount,
    payment_method,
    cash_collected_by,
    commission_rate
  )
  values (
    target_order.id,
    target_order.company_id,
    target_order.price,
    target_order.payment_method,
    case
      when target_order.payment_method = 'cash'::payment_method then 'company_driver'::cash_collected_by_type
      else null
    end,
    coalesce(target_company.commission_rate, 0)
  )
  on conflict (order_id) do nothing
  returning id into financial_id;

  if financial_id is null then
    select id into financial_id
    from order_financials
    where order_id = target_order.id;
  end if;

  return financial_id;
end;
$$;

create or replace function create_supplier_settlement(
  target_company_id uuid,
  target_period_start date,
  target_period_end date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settlement_id uuid;
begin
  if not is_admin() then
    raise exception 'Only admin can create supplier settlements';
  end if;

  insert into supplier_settlements (
    company_id,
    period_start,
    period_end,
    gross_sales,
    card_sales,
    cash_sales,
    falaj_commission_total,
    supplier_payable,
    supplier_owes_falaj,
    net_transfer_amount
  )
  select
    target_company_id,
    target_period_start,
    target_period_end,
    coalesce(sum(gross_amount), 0),
    coalesce(sum(gross_amount) filter (where payment_method = 'card'::payment_method), 0),
    coalesce(sum(gross_amount) filter (where payment_method = 'cash'::payment_method), 0),
    coalesce(sum(falaj_commission_amount), 0),
    coalesce(sum(supplier_net_amount) filter (
      where payment_method = 'card'::payment_method or cash_collected_by = 'falaj_driver'::cash_collected_by_type
    ), 0),
    coalesce(sum(falaj_commission_amount) filter (
      where payment_method = 'cash'::payment_method
        and cash_collected_by in ('supplier'::cash_collected_by_type, 'company_driver'::cash_collected_by_type)
    ), 0),
    coalesce(sum(supplier_net_amount) filter (
      where payment_method = 'card'::payment_method or cash_collected_by = 'falaj_driver'::cash_collected_by_type
    ), 0) -
    coalesce(sum(falaj_commission_amount) filter (
      where payment_method = 'cash'::payment_method
        and cash_collected_by in ('supplier'::cash_collected_by_type, 'company_driver'::cash_collected_by_type)
    ), 0)
  from order_financials
  where company_id = target_company_id
    and settlement_status = 'unsettled'::settlement_status
    and created_at::date between target_period_start and target_period_end
  returning id into v_settlement_id;

  insert into settlement_items (
    settlement_id,
    order_financial_id,
    gross_amount,
    falaj_commission_amount,
    supplier_net_amount
  )
  select
    v_settlement_id,
    id,
    gross_amount,
    falaj_commission_amount,
    supplier_net_amount
  from order_financials
  where company_id = target_company_id
    and settlement_status = 'unsettled'::settlement_status
    and created_at::date between target_period_start and target_period_end;

  update order_financials
  set settlement_status = 'included'::settlement_status
  where id in (
    select order_financial_id
    from settlement_items
    where settlement_items.settlement_id = v_settlement_id
  );

  return v_settlement_id;
end;
$$;

alter table order_financials enable row level security;
alter table supplier_settlements enable row level security;
alter table settlement_items enable row level security;
alter table driver_locations enable row level security;
alter table driver_delivery_schedule enable row level security;

drop policy if exists "profiles admin read all" on profiles;
create policy "profiles admin read all"
on profiles for select to authenticated
using (is_admin());

drop policy if exists "companies admin manage all" on companies;
create policy "companies admin manage all"
on companies for all to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "orders admin manage all" on orders;
create policy "orders admin manage all"
on orders for all to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "orders drivers read own orders" on orders;
create policy "orders drivers read own orders"
on orders for select to authenticated
using (
  exists (
    select 1
    from drivers
    where drivers.id = orders.driver_id
      and drivers.profile_id = auth.uid()
  )
);

drop policy if exists "drivers admin manage all" on drivers;
create policy "drivers admin manage all"
on drivers for all to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "products admin manage all" on products;
create policy "products admin manage all"
on products for all to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "order financials admin manage all" on order_financials;
create policy "order financials admin manage all"
on order_financials for all to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "order financials company read own" on order_financials;
create policy "order financials company read own"
on order_financials for select to authenticated
using (is_company_owner(company_id));

drop policy if exists "supplier settlements admin manage all" on supplier_settlements;
create policy "supplier settlements admin manage all"
on supplier_settlements for all to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "supplier settlements company read own" on supplier_settlements;
create policy "supplier settlements company read own"
on supplier_settlements for select to authenticated
using (is_company_owner(company_id));

drop policy if exists "settlement items admin manage all" on settlement_items;
create policy "settlement items admin manage all"
on settlement_items for all to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "settlement items company read own" on settlement_items;
create policy "settlement items company read own"
on settlement_items for select to authenticated
using (
  exists (
    select 1
    from supplier_settlements
    where supplier_settlements.id = settlement_items.settlement_id
      and is_company_owner(supplier_settlements.company_id)
  )
);

drop policy if exists "driver locations admin read all" on driver_locations;
create policy "driver locations admin read all"
on driver_locations for select to authenticated
using (is_admin());

drop policy if exists "driver locations company read own" on driver_locations;
create policy "driver locations company read own"
on driver_locations for select to authenticated
using (is_company_owner(company_id));

drop policy if exists "driver locations driver insert own" on driver_locations;
create policy "driver locations driver insert own"
on driver_locations for insert to authenticated
with check (
  exists (
    select 1
    from drivers
    where drivers.id = driver_locations.driver_id
      and drivers.profile_id = auth.uid()
      and drivers.company_id = driver_locations.company_id
  )
);

drop policy if exists "driver schedule admin manage all" on driver_delivery_schedule;
create policy "driver schedule admin manage all"
on driver_delivery_schedule for all to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "driver schedule company read own" on driver_delivery_schedule;
create policy "driver schedule company read own"
on driver_delivery_schedule for select to authenticated
using (is_company_owner(company_id));

drop policy if exists "driver schedule driver read own" on driver_delivery_schedule;
create policy "driver schedule driver read own"
on driver_delivery_schedule for select to authenticated
using (
  exists (
    select 1
    from drivers
    where drivers.id = driver_delivery_schedule.driver_id
      and drivers.profile_id = auth.uid()
  )
);
