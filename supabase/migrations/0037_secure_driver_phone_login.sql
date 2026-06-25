-- Falaj Web - secure driver phone login.
-- Scope:
-- 1. Stop exposing driver email lookups to anon/authenticated clients.
-- 2. Provide a private phone-to-driver email resolver for the Edge Function only.
-- 3. Store coarse login throttling buckets used by the Edge Function.

create table if not exists public.driver_login_rate_limits (
  rate_key text primary key,
  attempts integer not null default 0 check (attempts >= 0),
  window_start timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.driver_login_rate_limits enable row level security;
revoke all on public.driver_login_rate_limits from anon;
revoke all on public.driver_login_rate_limits from authenticated;

create or replace function public.resolve_driver_login_identifier(p_identifier text)
returns table (
  login_status text,
  email text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query select 'disabled'::text, null::text;
end;
$$;

revoke all on function public.resolve_driver_login_identifier(text) from public;
revoke all on function public.resolve_driver_login_identifier(text) from anon;
revoke all on function public.resolve_driver_login_identifier(text) from authenticated;

create or replace function public.resolve_driver_phone_login_private(p_identifier text)
returns table (
  login_status text,
  email text,
  profile_id uuid,
  driver_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_digits text := regexp_replace(coalesce(p_identifier, ''), '[^0-9]', '', 'g');
  v_local_digits text := regexp_replace(regexp_replace(coalesce(p_identifier, ''), '[^0-9]', '', 'g'), '^968', '');
  v_driver record;
begin
  if length(v_digits) < 6 then
    return query select 'invalid'::text, null::text, null::uuid, null::uuid;
    return;
  end if;

  select
    d.id,
    d.email as driver_email,
    d.is_active,
    d.profile_id,
    p.email as profile_email,
    p.role::text as role,
    p.account_type::text as account_type
  into v_driver
  from public.drivers d
  left join public.profiles p on p.id = d.profile_id
  where regexp_replace(coalesce(d.phone, ''), '[^0-9]', '', 'g') in (v_digits, v_local_digits)
     or concat('968', regexp_replace(coalesce(d.phone, ''), '[^0-9]', '', 'g')) = v_digits
  order by d.updated_at desc nulls last, d.created_at desc
  limit 1;

  if v_driver.id is null then
    return query select 'invalid'::text, null::text, null::uuid, null::uuid;
    return;
  end if;

  if coalesce(v_driver.is_active, false) is not true then
    return query select 'invalid'::text, null::text, null::uuid, null::uuid;
    return;
  end if;

  if v_driver.profile_id is null or v_driver.profile_email is null then
    return query select 'invalid'::text, null::text, null::uuid, null::uuid;
    return;
  end if;

  if coalesce(lower(v_driver.role), '') <> 'driver'
     or coalesce(lower(v_driver.account_type), '') <> 'driver' then
    return query select 'invalid'::text, null::text, null::uuid, null::uuid;
    return;
  end if;

  return query
  select
    'ok'::text,
    lower(v_driver.profile_email)::text,
    v_driver.profile_id::uuid,
    v_driver.id::uuid;
end;
$$;

revoke all on function public.resolve_driver_phone_login_private(text) from public;
revoke all on function public.resolve_driver_phone_login_private(text) from anon;
revoke all on function public.resolve_driver_phone_login_private(text) from authenticated;
grant execute on function public.resolve_driver_phone_login_private(text) to service_role;
