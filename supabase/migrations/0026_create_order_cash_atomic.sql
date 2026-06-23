-- Falaj Web - atomic cash on delivery order creation.
-- The current orders schema requires customer_id -> profiles(id), so this RPC
-- is intentionally authenticated-only. Public/anon checkout can be added later
-- with an explicit customer/session design.

create or replace function public.create_order_cash_atomic(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_area text,
  p_delivery_details text,
  p_items jsonb
)
returns table (
  order_id uuid,
  public_code text,
  total numeric,
  status public.order_status
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_product record;
  v_company_id uuid;
  v_total numeric := 0;
  v_volume_liters integer := 0;
  v_water_type text := null;
  v_order_id uuid;
  v_public_code text;
  v_line_total numeric;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to create an order.';
  end if;

  if p_customer_name is null or length(trim(p_customer_name)) < 2 then
    raise exception 'Customer name is required.';
  end if;

  if p_customer_phone is null or length(trim(p_customer_phone)) < 5 then
    raise exception 'Customer phone is required.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order items are required.';
  end if;

  -- Validate everything and lock product rows before creating the order.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if not (v_item ? 'product_id') or not (v_item ? 'quantity') then
      raise exception 'Each item must include product_id and quantity.';
    end if;

    begin
      v_product_id := (v_item->>'product_id')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
    exception
      when others then
        raise exception 'Invalid order item.';
    end;

    if v_quantity <= 0 then
      raise exception 'Item quantity must be greater than zero.';
    end if;

    select
      p.id,
      p.company_id,
      p.name_ar,
      p.price,
      p.water_type,
      p.volume_liters,
      p.stock_quantity,
      p.min_order_quantity,
      p.max_order_quantity,
      p.track_inventory,
      p.approval_status,
      p.is_visible,
      p.is_available,
      c.is_active as company_is_active,
      c.onboarding_status as company_onboarding_status
    into v_product
    from public.products p
    join public.companies c on c.id = p.company_id
    where p.id = v_product_id
    for update of p;

    if not found then
      raise exception 'Product is not available.';
    end if;

    if v_product.approval_status <> 'approved'
      or v_product.is_visible is not true
      or v_product.is_available is not true
      or v_product.company_is_active is not true
      or v_product.company_onboarding_status <> 'activated' then
      raise exception 'Product is not eligible for ordering.';
    end if;

    if v_company_id is null then
      v_company_id := v_product.company_id;
      v_water_type := v_product.water_type;
    elsif v_company_id <> v_product.company_id then
      raise exception 'All order items must belong to the same supplier.';
    end if;

    if v_quantity < coalesce(v_product.min_order_quantity, 1) then
      raise exception 'Quantity is below the product minimum.';
    end if;

    if v_product.max_order_quantity is not null and v_quantity > v_product.max_order_quantity then
      raise exception 'Quantity exceeds the product maximum.';
    end if;

    if v_product.track_inventory is true and v_product.stock_quantity < v_quantity then
      raise exception 'Insufficient product stock.';
    end if;

    if v_product.volume_liters is null or v_product.volume_liters <= 0 then
      raise exception 'Product volume is required for ordering.';
    end if;

    v_line_total := v_product.price * v_quantity;
    v_total := v_total + v_line_total;
    v_volume_liters := v_volume_liters + (v_product.volume_liters * v_quantity);
  end loop;

  if v_company_id is null or v_total <= 0 or v_volume_liters <= 0 then
    raise exception 'Order totals are invalid.';
  end if;

  v_public_code := 'FLJ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders (
    public_code,
    customer_id,
    customer_name_snapshot,
    customer_phone_snapshot,
    company_id,
    water_type,
    volume_liters,
    delivery_area,
    delivery_details,
    status,
    payment_method,
    payment_status,
    cash_collected_by_driver,
    price,
    notes
  )
  values (
    v_public_code,
    v_user_id,
    trim(p_customer_name),
    trim(p_customer_phone),
    v_company_id,
    v_water_type,
    v_volume_liters,
    nullif(trim(coalesce(p_delivery_area, '')), ''),
    nullif(trim(coalesce(p_delivery_details, '')), ''),
    'pending',
    'cash',
    'unpaid',
    false,
    v_total,
    'Cash on delivery order'
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    select p.id, p.company_id, p.name_ar, p.price, p.track_inventory
    into v_product
    from public.products p
    where p.id = v_product_id
    for update;

    v_line_total := v_product.price * v_quantity;

    insert into public.order_items (
      order_id,
      product_id,
      company_id,
      product_name_snapshot,
      unit_price,
      quantity,
      line_total
    )
    values (
      v_order_id,
      v_product.id,
      v_product.company_id,
      v_product.name_ar,
      v_product.price,
      v_quantity,
      v_line_total
    );

    if v_product.track_inventory is true then
      update public.products
      set stock_quantity = stock_quantity - v_quantity,
          updated_at = now()
      where id = v_product.id;
    end if;
  end loop;

  insert into public.order_status_history (
    order_id,
    status,
    changed_by_profile_id,
    note
  )
  values (
    v_order_id,
    'pending',
    v_user_id,
    'Cash on delivery order created'
  );

  return query
  select v_order_id, v_public_code, v_total, 'pending'::public.order_status;
end;
$$;

revoke all on function public.create_order_cash_atomic(text, text, text, text, jsonb) from public;
revoke all on function public.create_order_cash_atomic(text, text, text, text, jsonb) from anon;
grant execute on function public.create_order_cash_atomic(text, text, text, text, jsonb) to authenticated;
