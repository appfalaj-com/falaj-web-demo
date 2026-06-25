-- Falaj Web - harden account role boundaries for driver links and audits.
-- Scope:
-- 1. Prevent drivers.profile_id from pointing to non-driver profiles.
-- 2. Provide an admin-only audit function for role/profile/auth metadata mismatches.

create or replace function public.ensure_driver_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile record;
begin
  if new.profile_id is null then
    return new;
  end if;

  select p.id, p.role::text as role, p.account_type::text as account_type
    into v_profile
  from public.profiles p
  where p.id = new.profile_id
  limit 1;

  if v_profile.id is null then
    raise exception 'Driver profile link is invalid'
      using errcode = '23514';
  end if;

  if coalesce(lower(v_profile.role), '') <> 'driver'
     or coalesce(lower(v_profile.account_type), '') <> 'driver' then
    raise exception 'Driver profile link must reference a driver profile'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_driver_profile_role_trigger on public.drivers;
create trigger ensure_driver_profile_role_trigger
before insert or update of profile_id on public.drivers
for each row
execute function public.ensure_driver_profile_role();

revoke all on function public.ensure_driver_profile_role() from public;
revoke all on function public.ensure_driver_profile_role() from anon;

create or replace function public.audit_account_role_boundaries()
returns table (
  issue_type text,
  profile_id uuid,
  email text,
  profile_role text,
  profile_account_type text,
  auth_role text,
  auth_account_type text,
  driver_id uuid,
  company_id uuid,
  details text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if public.current_user_role() <> 'admin'::account_type then
    return;
  end if;

  return query
  select
    'non_driver_profile_linked_to_driver'::text as issue_type,
    p.id as profile_id,
    coalesce(p.email, d.email)::text as email,
    p.role::text as profile_role,
    p.account_type::text as profile_account_type,
    (u.raw_user_meta_data ->> 'role')::text as auth_role,
    (u.raw_user_meta_data ->> 'account_type')::text as auth_account_type,
    d.id as driver_id,
    d.company_id,
    'drivers.profile_id points to a profile that is not driver/driver'::text as details
  from public.drivers d
  join public.profiles p on p.id = d.profile_id
  left join auth.users u on u.id = p.id
  where d.profile_id is not null
    and (
      coalesce(lower(p.role::text), '') <> 'driver'
      or coalesce(lower(p.account_type::text), '') <> 'driver'
    )

  union all

  select
    'auth_metadata_profile_role_mismatch'::text as issue_type,
    p.id as profile_id,
    coalesce(p.email, u.email)::text as email,
    p.role::text as profile_role,
    p.account_type::text as profile_account_type,
    (u.raw_user_meta_data ->> 'role')::text as auth_role,
    (u.raw_user_meta_data ->> 'account_type')::text as auth_account_type,
    null::uuid as driver_id,
    null::uuid as company_id,
    'auth.users raw_user_meta_data role/account_type differs from public.profiles'::text as details
  from public.profiles p
  join auth.users u on u.id = p.id
  where (
      nullif(lower(u.raw_user_meta_data ->> 'role'), '') is not null
      and lower(u.raw_user_meta_data ->> 'role') <> lower(p.role::text)
    )
    or (
      nullif(lower(u.raw_user_meta_data ->> 'account_type'), '') is not null
      and lower(u.raw_user_meta_data ->> 'account_type') <> lower(p.account_type::text)
    );
end;
$$;

revoke all on function public.audit_account_role_boundaries() from public;
revoke all on function public.audit_account_role_boundaries() from anon;
grant execute on function public.audit_account_role_boundaries() to authenticated;
