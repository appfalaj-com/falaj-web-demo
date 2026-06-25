-- Falaj Web - accept driver invite on first authenticated driver session.
-- Scope: link an authenticated driver Auth user to its operational driver row.
-- Safety: company/admin profiles are never converted to drivers.

create or replace function public.accept_driver_invite_for_current_user()
returns table (
  accept_status text,
  driver_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_profile record;
  v_driver record;
begin
  if v_user_id is null or v_email is null then
    return query select 'not_authenticated'::text, null::uuid;
    return;
  end if;

  select p.id, p.email, p.full_name, p.phone, p.role::text as role, p.account_type::text as account_type
    into v_profile
  from public.profiles p
  where p.id = v_user_id
     or lower(p.email) = v_email
  order by case when p.id = v_user_id then 0 else 1 end
  limit 1;

  if v_profile.id is not null and v_profile.id <> v_user_id then
    return query select 'email_profile_conflict'::text, null::uuid;
    return;
  end if;

  if coalesce(lower(v_profile.role), '') in ('company', 'admin')
     or coalesce(lower(v_profile.account_type), '') in ('company', 'admin') then
    return query select 'company_account'::text, null::uuid;
    return;
  end if;

  select d.*
    into v_driver
  from public.drivers d
  where lower(d.email) = v_email
    and d.is_active is true
    and (d.profile_id is null or d.profile_id = v_user_id)
  order by case when d.profile_id = v_user_id then 0 else 1 end, d.created_at desc
  limit 1;

  if v_driver.id is null then
    if exists (
      select 1
      from public.drivers d
      where lower(d.email) = v_email
        and d.is_active is not true
    ) then
      return query select 'inactive'::text, null::uuid;
      return;
    end if;

    return query select 'not_found'::text, null::uuid;
    return;
  end if;

  insert into public.profiles (id, email, full_name, phone, role, account_type)
  values (
    v_user_id,
    v_email,
    coalesce(nullif(v_driver.name, ''), v_email),
    v_driver.phone,
    'driver'::account_type,
    'driver'::account_type
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    role = 'driver'::account_type,
    account_type = 'driver'::account_type;

  update public.drivers
  set
    profile_id = v_user_id,
    email = v_email,
    invite_status = 'accepted',
    updated_at = now()
  where id = v_driver.id
    and (profile_id is null or profile_id = v_user_id);

  return query select 'accepted'::text, v_driver.id;
end;
$$;

revoke all on function public.accept_driver_invite_for_current_user() from public;
revoke all on function public.accept_driver_invite_for_current_user() from anon;
grant execute on function public.accept_driver_invite_for_current_user() to authenticated;
