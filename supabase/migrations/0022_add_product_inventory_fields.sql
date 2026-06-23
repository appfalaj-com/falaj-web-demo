-- Falaj Web - product inventory readiness fields.
-- Scope: products metadata only. Stock deduction must be atomic when real orders are created.

alter table products
  add column if not exists stock_quantity integer not null default 0,
  add column if not exists min_order_quantity integer not null default 1,
  add column if not exists max_order_quantity integer,
  add column if not exists track_inventory boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_stock_quantity_non_negative') then
    alter table products add constraint products_stock_quantity_non_negative check (stock_quantity >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'products_min_order_quantity_positive') then
    alter table products add constraint products_min_order_quantity_positive check (min_order_quantity > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'products_max_order_quantity_positive') then
    alter table products add constraint products_max_order_quantity_positive check (max_order_quantity is null or max_order_quantity > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'products_order_quantity_range') then
    alter table products add constraint products_order_quantity_range check (max_order_quantity is null or max_order_quantity >= min_order_quantity) not valid;
  end if;
end $$;
