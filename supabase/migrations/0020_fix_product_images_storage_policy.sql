-- Falaj Web - fix product image upload ownership check.
-- Scope: Supabase Storage policies for product-images only.

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

drop policy if exists "company users upload own product images" on storage.objects;
drop policy if exists "company users update own product images" on storage.objects;

create policy "company users upload own product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(storage.objects.name))[1] = 'products'
  and public.current_user_owns_company((storage.foldername(storage.objects.name))[2])
);

create policy "company users update own product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(storage.objects.name))[1] = 'products'
  and public.current_user_owns_company((storage.foldername(storage.objects.name))[2])
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(storage.objects.name))[1] = 'products'
  and public.current_user_owns_company((storage.foldername(storage.objects.name))[2])
);
