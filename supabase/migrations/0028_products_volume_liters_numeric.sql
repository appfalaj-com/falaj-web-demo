-- Falaj Web - allow decimal product volume values.
-- Scope: products.volume_liters only.

alter table public.products
  alter column volume_liters type numeric
  using volume_liters::numeric;

alter table public.products
  drop constraint if exists products_volume_liters_check;

alter table public.products
  add constraint products_volume_liters_check
  check (volume_liters > 0);
