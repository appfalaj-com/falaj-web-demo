-- Falaj Web - allow authenticated customer users to create/update their own profile.
-- Scope: public.profiles RLS only. No anonymous access and no role escalation.

alter table public.profiles enable row level security;

revoke insert, update on public.profiles from anon;
grant insert, update on public.profiles to authenticated;

drop policy if exists "profiles customers insert own customer profile" on public.profiles;
drop policy if exists "profiles customers update own customer profile" on public.profiles;

create policy "profiles customers insert own customer profile"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role::text = 'customer'
  and account_type::text = 'customer'
);

create policy "profiles customers update own customer profile"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  and role::text = 'customer'
  and account_type::text = 'customer'
)
with check (
  id = auth.uid()
  and role::text = 'customer'
  and account_type::text = 'customer'
);
