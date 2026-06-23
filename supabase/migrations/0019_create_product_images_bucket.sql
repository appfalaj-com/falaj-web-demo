-- Falaj Web - product images storage bucket and policies.
-- Scope: Supabase Storage only. Apply after review.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product images public read" on storage.objects;
drop policy if exists "company users upload own product images" on storage.objects;
drop policy if exists "company users update own product images" on storage.objects;

create policy "product images public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

create policy "company users upload own product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = 'products'
  and exists (
    select 1
    from public.companies
    where companies.id::text = (storage.foldername(name))[2]
      and companies.owner_id = auth.uid()
  )
);

create policy "company users update own product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = 'products'
  and exists (
    select 1
    from public.companies
    where companies.id::text = (storage.foldername(name))[2]
      and companies.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = 'products'
  and exists (
    select 1
    from public.companies
    where companies.id::text = (storage.foldername(name))[2]
      and companies.owner_id = auth.uid()
  )
);
