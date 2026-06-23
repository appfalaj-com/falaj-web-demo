-- Falaj Web - company logo upload and safe public catalog metadata.
-- Scope: company-logos storage bucket, upload policies, and public catalog metadata RPC.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.current_user_owns_company(company_id_text text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  company_uuid uuid;
begin
  begin
    company_uuid := company_id_text::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return exists (
    select 1
    from public.companies c
    where c.id = company_uuid
      and c.owner_id = auth.uid()
  );
end;
$$;

revoke all on function public.current_user_owns_company(text) from public;
grant execute on function public.current_user_owns_company(text) to authenticated;

drop policy if exists "public read company logos" on storage.objects;
drop policy if exists "company users upload own company logos" on storage.objects;
drop policy if exists "company users update own company logos" on storage.objects;

create policy "public read company logos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'company-logos');

create policy "company users upload own company logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-logos'
  and (storage.foldername(storage.objects.name))[1] = 'logos'
  and public.current_user_owns_company((storage.foldername(storage.objects.name))[2])
);

create policy "company users update own company logos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-logos'
  and (storage.foldername(storage.objects.name))[1] = 'logos'
  and public.current_user_owns_company((storage.foldername(storage.objects.name))[2])
)
with check (
  bucket_id = 'company-logos'
  and (storage.foldername(storage.objects.name))[1] = 'logos'
  and public.current_user_owns_company((storage.foldername(storage.objects.name))[2])
);

create or replace function public.get_public_catalog_companies()
returns table (
  company_id uuid,
  name text,
  logo_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct
    c.id as company_id,
    c.name,
    c.logo_url
  from public.companies c
  where c.is_active = true
    and c.onboarding_status = 'activated'
    and exists (
      select 1
      from public.products p
      where p.company_id = c.id
        and p.approval_status = 'approved'
        and p.is_visible = true
        and p.is_available = true
    );
$$;

revoke all on function public.get_public_catalog_companies() from public;
grant execute on function public.get_public_catalog_companies() to anon, authenticated;
