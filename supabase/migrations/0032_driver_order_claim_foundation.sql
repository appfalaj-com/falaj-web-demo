-- Falaj Web - driver order claim foundation.
-- Scope: read available unassigned orders for the authenticated active driver company,
-- and atomically claim one unassigned order.

create or replace function public.get_driver_available_orders()
returns table (
  id uuid,
  public_code text,
  customer_name_snapshot text,
  customer_phone_snapshot text,
  company_id uuid,
  driver_id uuid,
  water_type text,
  volume_liters numeric,
  delivery_area text,
  delivery_details text,
  delivery_lat numeric,
  delivery_lng numeric,
  status public.order_status,
  payment_method public.payment_method,
  payment_status public.payment_status,
  cash_collected_by_driver boolean,
  cash_collected_at timestamptz,
  cash_collected_by_driver_id uuid,
  price numeric,
  notes text,
  scheduled_at timestamptz,
  accepted_at timestamptz,
  assigned_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  company_name text,
  items jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
begin
  select d.company_id
    into v_company_id
  from public.drivers d
  where d.profile_id = auth.uid()
    and d.is_active = true
  order by d.created_at desc
  limit 1;

  if v_company_id is null then
    raise exception 'Active driver account was not found'
      using errcode = 'P0001';
  end if;

  return query
  select
    o.id,
    o.public_code,
    o.customer_name_snapshot,
    o.customer_phone_snapshot,
    o.company_id,
    o.driver_id,
    o.water_type,
    o.volume_liters,
    o.delivery_area,
    o.delivery_details,
    o.delivery_lat,
    o.delivery_lng,
    o.status,
    o.payment_method,
    o.payment_status,
    o.cash_collected_by_driver,
    o.cash_collected_at,
    o.cash_collected_by_driver_id,
    o.price,
    o.notes,
    o.scheduled_at,
    o.accepted_at,
    o.assigned_at,
    o.en_route_at,
    o.arrived_at,
    o.delivered_at,
    o.failed_at,
    o.cancelled_at,
    o.created_at,
    o.updated_at,
    c.name as company_name,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'order_id', oi.order_id,
            'product_id', oi.product_id,
            'company_id', oi.company_id,
            'product_name_snapshot', oi.product_name_snapshot,
            'unit_price', oi.unit_price,
            'quantity', oi.quantity,
            'line_total', oi.line_total,
            'created_at', oi.created_at
          )
          order by oi.created_at asc
        )
        from public.order_items oi
        where oi.order_id = o.id
      ),
      '[]'::jsonb
    ) as items
  from public.orders o
  left join public.companies c on c.id = o.company_id
  where o.company_id = v_company_id
    and o.driver_id is null
    and o.status in ('pending', 'accepted')
  order by o.created_at asc;
end;
$$;

create or replace function public.driver_claim_order(p_order_id uuid)
returns table (
  order_id uuid,
  status public.order_status,
  driver_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_driver_id uuid;
  v_company_id uuid;
  v_order_id uuid;
  v_status public.order_status;
  v_changed_by uuid := auth.uid();
begin
  if p_order_id is null then
    raise exception 'order_id is required'
      using errcode = '22023';
  end if;

  select d.id, d.company_id
    into v_driver_id, v_company_id
  from public.drivers d
  where d.profile_id = auth.uid()
    and d.is_active = true
  order by d.created_at desc
  limit 1;

  if v_driver_id is null or v_company_id is null then
    raise exception 'Active driver account was not found'
      using errcode = 'P0001';
  end if;

  update public.orders o
  set
    driver_id = v_driver_id,
    status = 'assigned',
    assigned_at = coalesce(o.assigned_at, now()),
    updated_at = now()
  where o.id = p_order_id
    and o.company_id = v_company_id
    and o.driver_id is null
    and o.status in ('pending', 'accepted')
  returning o.id, o.status
    into v_order_id, v_status;

  if v_order_id is null then
    raise exception 'Order is not available to claim'
      using errcode = 'P0001';
  end if;

  insert into public.order_status_history (
    order_id,
    status,
    changed_by_profile_id,
    note
  ) values (
    v_order_id,
    'assigned',
    v_changed_by,
    'Driver claimed order'
  );

  return query
  select v_order_id, v_status, v_driver_id;
end;
$$;

revoke all on function public.get_driver_available_orders() from public;
revoke all on function public.driver_claim_order(uuid) from public;

grant execute on function public.get_driver_available_orders() to authenticated;
grant execute on function public.driver_claim_order(uuid) to authenticated;
