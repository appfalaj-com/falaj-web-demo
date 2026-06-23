-- Falaj Web - allow company users to update only their own company logo URL.
-- Scope: safe RPC only; does not open direct companies update policies.

create or replace function public.update_own_company_logo(
  p_company_id uuid,
  p_logo_url text
)
returns table (
  id uuid,
  name text,
  email text,
  phone text,
  logo_url text,
  is_active boolean,
  commission_rate numeric,
  owner_id uuid,
  onboarding_status text,
  updated_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_logo_url is null
    or p_logo_url not like '%/storage/v1/object/public/company-logos/logos/' || p_company_id::text || '/%' then
    raise exception 'Invalid company logo URL';
  end if;

  return query
  update public.companies c
  set logo_url = p_logo_url
  where c.id = p_company_id
    and c.owner_id = auth.uid()
  returning
    c.id,
    c.name,
    c.email,
    c.phone,
    c.logo_url,
    c.is_active,
    c.commission_rate,
    c.owner_id,
    c.onboarding_status,
    c.updated_at,
    c.created_at;
end;
$$;

revoke all on function public.update_own_company_logo(uuid, text) from public;
grant execute on function public.update_own_company_logo(uuid, text) to authenticated;
