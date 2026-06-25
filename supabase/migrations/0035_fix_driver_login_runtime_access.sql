-- Falaj Web - fix driver login runtime access.
-- Scope:
-- 1. Let authenticated active drivers read their own driver row.
-- 2. Fix phone login resolver enum casts for role/account_type.

alter table public.drivers enable row level security;
grant select on public.drivers to authenticated;

drop policy if exists "driver users can read own driver row" on public.drivers;
create policy "driver users can read own driver row"
on public.drivers
for select
to authenticated
using (
  profile_id = auth.uid()
);

create or replace function public.resolve_driver_login_identifier(p_identifier text)
returns table (
  login_status text,
  email text
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
    return query select 'not_found'::text, null::text;
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
    return query select 'not_found'::text, null::text;
    return;
  end if;

  if coalesce(v_driver.is_active, false) is not true then
    return query select 'inactive'::text, null::text;
    return;
  end if;

  if v_driver.profile_id is null or v_driver.profile_email is null then
    return query select 'not_linked'::text, null::text;
    return;
  end if;

  if coalesce(lower(v_driver.role), '') <> 'driver'
     or coalesce(lower(v_driver.account_type), '') <> 'driver' then
    return query select 'invalid_role'::text, null::text;
    return;
  end if;

  return query select 'ok'::text, lower(v_driver.profile_email)::text;
end;
$$;

revoke all on function public.resolve_driver_login_identifier(text) from public;
grant execute on function public.resolve_driver_login_identifier(text) to anon, authenticated;
