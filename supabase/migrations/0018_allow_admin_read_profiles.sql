-- Falaj Web - allow admins to read profiles needed for supplier activation checks.
-- Scope: profiles SELECT policies only.

alter table profiles enable row level security;

-- Do not expose profiles to anonymous visitors.
revoke select, insert, update, delete, truncate on profiles from anon;

-- Authenticated users still need SELECT grants; RLS limits which rows they see.
grant select on profiles to authenticated;

drop policy if exists "profiles read own profile" on profiles;
drop policy if exists "profiles read own profile by id or email" on profiles;
drop policy if exists "profiles users read own profile" on profiles;
drop policy if exists "profiles admin read all" on profiles;

create policy "profiles read own profile by id or email"
on profiles
for select
to authenticated
using (
  id = auth.uid()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "profiles admin read all"
on profiles
for select
to authenticated
using (current_user_role() = 'admin');
