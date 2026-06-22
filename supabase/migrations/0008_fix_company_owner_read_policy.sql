-- Falaj Web - allow company users to read their own company through owner_id.
-- Keeps admin access intact and does not expose companies publicly.

drop policy if exists "Company users can read own company by owner_id" on companies;

create policy "Company users can read own company by owner_id"
on companies
for select
to authenticated
using (
  owner_id = auth.uid()
  or current_user_role() = 'admin'
);
