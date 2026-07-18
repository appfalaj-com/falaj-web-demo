-- Falaj Web - foreground driver tracking metadata.
-- Adds optional metadata for browser foreground location pings without
-- changing existing driver/order RLS or order lifecycle behavior.

alter table public.driver_locations
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists heading numeric,
  add column if not exists speed numeric,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_driver_locations_order_id_recorded_at
  on public.driver_locations(order_id, recorded_at desc);

create index if not exists idx_driver_locations_updated_at
  on public.driver_locations(updated_at desc);

do $$
begin
  alter publication supabase_realtime add table public.driver_locations;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
