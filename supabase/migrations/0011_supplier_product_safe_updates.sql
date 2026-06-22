-- Falaj Web - allow suppliers to safely manage visibility/availability
-- for their own approved products without bypassing catalog moderation.

create or replace function prevent_company_product_moderation_bypass()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user_role() <> 'company' then
    return new;
  end if;

  if not exists (
    select 1
    from companies
    where companies.id = old.company_id
      and companies.owner_id = auth.uid()
  ) then
    raise exception 'Company users can only update their own products';
  end if;

  if new.approval_status = 'pending_review' and new.is_visible = false then
    return new;
  end if;

  if new.company_id is not distinct from old.company_id
    and new.name_ar is not distinct from old.name_ar
    and new.name_en is not distinct from old.name_en
    and new.category is not distinct from old.category
    and new.water_type is not distinct from old.water_type
    and new.size_label is not distinct from old.size_label
    and new.volume_liters is not distinct from old.volume_liters
    and new.price is not distinct from old.price
    and new.image_url is not distinct from old.image_url
    and new.image_path is not distinct from old.image_path
    and new.delivery_estimate is not distinct from old.delivery_estimate
    and new.description is not distinct from old.description
    and new.sort_order is not distinct from old.sort_order
    and new.approval_status is not distinct from old.approval_status
    and new.is_visible is not distinct from old.is_visible
    and new.admin_review_notes is not distinct from old.admin_review_notes
    and new.reviewed_by is not distinct from old.reviewed_by
    and new.reviewed_at is not distinct from old.reviewed_at then
    return new;
  end if;

  if old.approval_status = 'approved' and new.approval_status = 'approved' then
    if new.company_id is distinct from old.company_id
      or new.name_ar is distinct from old.name_ar
      or new.name_en is distinct from old.name_en
      or new.category is distinct from old.category
      or new.water_type is distinct from old.water_type
      or new.size_label is distinct from old.size_label
      or new.volume_liters is distinct from old.volume_liters
      or new.price is distinct from old.price
      or new.image_url is distinct from old.image_url
      or new.image_path is distinct from old.image_path
      or new.delivery_estimate is distinct from old.delivery_estimate
      or new.description is distinct from old.description
      or new.sort_order is distinct from old.sort_order
      or new.admin_review_notes is distinct from old.admin_review_notes
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'Approved products can only change visibility or availability by supplier';
    end if;

    return new;
  end if;

  raise exception 'Product changes must be submitted for admin review';
end;
$$;

drop trigger if exists prevent_company_product_moderation_bypass_trigger on products;
create trigger prevent_company_product_moderation_bypass_trigger
before update on products
for each row
execute function prevent_company_product_moderation_bypass();

drop policy if exists "company users safely update own approved product flags" on products;
create policy "company users safely update own approved product flags"
on products
for update
to authenticated
using (
  current_user_role() = 'company'
  and exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.owner_id = auth.uid()
  )
)
with check (
  current_user_role() = 'company'
  and exists (
    select 1
    from companies
    where companies.id = products.company_id
      and companies.owner_id = auth.uid()
  )
  and (
    approval_status in ('pending_review', 'approved', 'rejected', 'hidden')
  )
);
