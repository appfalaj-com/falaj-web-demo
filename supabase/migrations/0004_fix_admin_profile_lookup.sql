-- Falaj Web - fix admin profile lookup when profiles.id does not yet match auth.users.id.
-- This keeps profile reads scoped to the signed-in user's own id or email.

drop policy if exists "profiles read own profile by id or email" on profiles;

create policy "profiles read own profile by id or email"
on profiles
for select
to authenticated
using (
  id = auth.uid()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create or replace function current_user_role()
returns account_type
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(role, account_type)
  from profiles
  where id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by case when id = auth.uid() then 0 else 1 end
  limit 1
$$;
