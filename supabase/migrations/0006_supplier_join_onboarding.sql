-- Falaj Web - supplier join onboarding workflow.
-- Keeps Auth user creation out of the frontend while allowing admins to create a preliminary company record.

alter table companies
  add column if not exists supplier_join_request_id uuid references supplier_join_requests(id) on delete set null,
  add column if not exists approved_join_request_id uuid references supplier_join_requests(id) on delete set null,
  add column if not exists onboarding_status text not null default 'not_started';

create unique index if not exists idx_companies_supplier_join_request_id
  on companies(supplier_join_request_id)
  where supplier_join_request_id is not null;

create index if not exists idx_companies_onboarding_status
  on companies(onboarding_status);

drop policy if exists "companies admin manage all via current user role" on companies;
create policy "companies admin manage all via current user role"
on companies
for all
to authenticated
using (current_user_role() = 'admin')
with check (current_user_role() = 'admin');
