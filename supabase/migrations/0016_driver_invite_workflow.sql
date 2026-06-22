-- Falaj Web - driver invite workflow support.
-- Suppliers store a driver email, while the Edge Function links auth.users to drivers.profile_id.

alter table drivers
  add column if not exists email text,
  add column if not exists invite_status text not null default 'not_sent',
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by uuid references auth.users(id) on delete set null;

create index if not exists idx_drivers_email on drivers(email);
create index if not exists idx_drivers_profile_id on drivers(profile_id);
