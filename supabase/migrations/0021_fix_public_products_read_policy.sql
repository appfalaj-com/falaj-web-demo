-- Falaj Web - fix public product catalog read policy.
-- Scope: products public SELECT policy only.

create or replace function public.company_is_public_catalog_active(company_id_value uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1
    from public.companies c
    where c.id = company_id_value
      and c.is_active = true
      and c.onboarding_status = 'activated'
  );
end;
$$;

revoke all on function public.company_is_public_catalog_active(uuid) from public;
grant execute on function public.company_is_public_catalog_active(uuid) to anon, authenticated;

drop policy if exists "products public read approved visible products" on products;

create policy "products public read approved visible products"
on products
for select
to anon, authenticated
using (
  approval_status = 'approved'
  and is_visible = true
  and is_available = true
  and public.company_is_public_catalog_active(company_id)
);

grant select on products to anon, authenticated;
revoke insert, update, delete, truncate on products from anon;
