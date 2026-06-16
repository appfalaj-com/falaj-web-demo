-- Falaj Web - initial database schema draft.
-- Checkpoint: Falaj_WebSupabaseSchema_DraftOnly_20260615
-- This migration is a draft only. It does not enable RLS and is not connected
-- to the React app yet.

create extension if not exists "pgcrypto";

create type order_status as enum (
  'pending',
  'accepted',
  'rejected',
  'assigned',
  'en_route',
  'arrived',
  'delivered',
  'failed',
  'cancelled'
);

create type payment_method as enum (
  'cash',
  'card'
);

create type payment_status as enum (
  'unpaid',
  'paid'
);

create type account_type as enum (
  'customer',
  'company',
  'driver',
  'admin'
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles: application user profile rows. In production, profiles.id is intended
-- to equal auth.users.id. No auth.users FK is added in this draft to keep local
-- migration setup simple before Supabase Auth is wired.
create table profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  account_type account_type not null default 'customer',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'Falaj user profiles for customers, company users, drivers, and admins.';
comment on column profiles.id is 'Intended to mirror auth.users.id in production once Supabase Auth is connected.';

create trigger set_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

-- companies: supplier/company records that receive and fulfill water orders.
create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete set null,
  name text not null,
  commercial_registration_number text,
  phone text,
  email text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table companies is 'Water supplier companies shown to customers and managed in the company dashboard.';

create trigger set_companies_updated_at
before update on companies
for each row execute function set_updated_at();

-- service_areas: delivery coverage areas for each company.
create table service_areas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  center_lat numeric(10, 7),
  center_lng numeric(10, 7),
  radius_km numeric(8, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_areas_center_lat_check check (center_lat is null or center_lat between -90 and 90),
  constraint service_areas_center_lng_check check (center_lng is null or center_lng between -180 and 180),
  constraint service_areas_radius_km_check check (radius_km is null or radius_km > 0)
);

comment on table service_areas is 'Company delivery coverage zones such as city, area, or radius-based service zones.';

create trigger set_service_areas_updated_at
before update on service_areas
for each row execute function set_updated_at();

-- products: company-managed product catalog that will be shown to customers in Falaj_Claude.
create table products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name_ar text not null,
  name_en text,
  category text not null,
  water_type text not null,
  size_label text,
  volume_liters int check (volume_liters > 0),
  price numeric(10, 3) not null check (price >= 0),
  image_url text,
  image_path text,
  is_available boolean not null default true,
  delivery_estimate text,
  description text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table products is 'Company product catalog shared later between Falaj_Web company tools and Falaj_Claude customer marketplace.';

create trigger set_products_updated_at
before update on products
for each row execute function set_updated_at();

-- drivers: drivers or tanker operators assigned to company orders.
create table drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  name text not null,
  phone text,
  vehicle_plate text,
  vehicle_label text,
  capacity_liters integer,
  is_active boolean not null default true,
  is_online boolean not null default false,
  last_lat numeric(10, 7),
  last_lng numeric(10, 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drivers_capacity_liters_check check (capacity_liters is null or capacity_liters > 0),
  constraint drivers_last_lat_check check (last_lat is null or last_lat between -90 and 90),
  constraint drivers_last_lng_check check (last_lng is null or last_lng between -180 and 180)
);

comment on table drivers is 'Company drivers who receive assigned orders and update delivery status.';

create trigger set_drivers_updated_at
before update on drivers
for each row execute function set_updated_at();

-- addresses: saved customer delivery addresses.
create table addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  label text,
  area text,
  details text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint addresses_lat_check check (lat is null or lat between -90 and 90),
  constraint addresses_lng_check check (lng is null or lng between -180 and 180)
);

comment on table addresses is 'Saved customer addresses used as delivery destinations.';

create trigger set_addresses_updated_at
before update on addresses
for each row execute function set_updated_at();

-- orders: core water delivery orders connecting customer, company, driver, delivery status, and payment status.
create table orders (
  id uuid primary key default gen_random_uuid(),
  public_code text unique,
  customer_id uuid not null references profiles(id) on delete restrict,
  customer_name_snapshot text,
  customer_phone_snapshot text,
  company_id uuid not null references companies(id) on delete restrict,
  driver_id uuid references drivers(id) on delete set null,
  address_id uuid references addresses(id) on delete set null,
  water_type text not null,
  volume_liters integer not null,
  delivery_area text,
  delivery_details text,
  delivery_lat numeric(10, 7),
  delivery_lng numeric(10, 7),
  status order_status not null default 'pending',
  payment_method payment_method not null default 'cash',
  payment_status payment_status not null default 'unpaid',
  cash_collected_by_driver boolean not null default false,
  cash_collected_at timestamptz,
  cash_collected_by_driver_id uuid references drivers(id) on delete set null,
  price numeric(10, 3) not null default 0,
  notes text,
  scheduled_at timestamptz,
  accepted_at timestamptz,
  assigned_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_volume_liters_check check (volume_liters > 0),
  constraint orders_delivery_lat_check check (delivery_lat is null or delivery_lat between -90 and 90),
  constraint orders_delivery_lng_check check (delivery_lng is null or delivery_lng between -180 and 180),
  constraint orders_price_check check (price >= 0)
);

comment on table orders is 'Main order table for water delivery lifecycle and payment state.';

create trigger set_orders_updated_at
before update on orders
for each row execute function set_updated_at();

-- order_status_history: immutable-style audit log of order status transitions.
create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  changed_by_profile_id uuid references profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

comment on table order_status_history is 'History of status changes for each order.';

-- ratings: customer ratings for completed deliveries, optionally tied to company and driver.
create table ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  driver_id uuid references drivers(id) on delete set null,
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, customer_id)
);

comment on table ratings is 'Customer ratings and comments for delivered orders.';

create trigger set_ratings_updated_at
before update on ratings
for each row execute function set_updated_at();

create index idx_companies_owner_id on companies(owner_id);
create index idx_service_areas_company_id on service_areas(company_id);
create index idx_products_company_id on products(company_id);
create index idx_products_is_available on products(is_available);
create index idx_drivers_company_id on drivers(company_id);
create index idx_addresses_customer_id on addresses(customer_id);
create index idx_orders_customer_id on orders(customer_id);
create index idx_orders_company_id on orders(company_id);
create index idx_orders_driver_id on orders(driver_id);
create index idx_orders_cash_collected_by_driver_id on orders(cash_collected_by_driver_id);
create index idx_orders_status on orders(status);
create index idx_orders_payment_status on orders(payment_status);
create index idx_order_status_history_order_id on order_status_history(order_id);
create index idx_ratings_company_id on ratings(company_id);
create index idx_ratings_driver_id on ratings(driver_id);
