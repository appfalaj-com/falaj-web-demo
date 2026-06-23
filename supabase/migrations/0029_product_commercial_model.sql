-- Falaj Web - product commercial selling unit metadata.
-- Scope: product packaging metadata only. Price remains the full selling-unit price.

alter table public.products
  add column if not exists unit_volume_liters numeric,
  add column if not exists selling_unit text not null default 'unit',
  add column if not exists units_per_package integer not null default 1,
  add column if not exists package_label text;

update public.products
set
  unit_volume_liters = coalesce(unit_volume_liters, volume_liters),
  selling_unit = coalesce(nullif(selling_unit, ''), 'unit'),
  units_per_package = coalesce(units_per_package, 1),
  package_label = coalesce(nullif(package_label, ''), size_label)
where
  unit_volume_liters is null
  or selling_unit is null
  or selling_unit = ''
  or units_per_package is null
  or package_label is null
  or package_label = '';

alter table public.products
  drop constraint if exists products_unit_volume_liters_positive;

alter table public.products
  add constraint products_unit_volume_liters_positive
  check (unit_volume_liters is null or unit_volume_liters > 0);

alter table public.products
  drop constraint if exists products_units_per_package_positive;

alter table public.products
  add constraint products_units_per_package_positive
  check (units_per_package > 0);

alter table public.products
  drop constraint if exists products_selling_unit_check;

alter table public.products
  add constraint products_selling_unit_check
  check (selling_unit in ('unit', 'pack', 'carton', 'gallon', 'tanker'));
