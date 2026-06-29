# Falaj Cash on Delivery Contract

This contract freezes the first production-safe customer order path. Customer checkout must call the atomic RPC and must not insert directly into `orders` or `order_items`.

## RPC

`public.create_order_cash_atomic`

## Caller

Authenticated customer/session only. If guest checkout is later required, design it explicitly before changing this contract.

## Input

```json
{
  "p_customer_name": "Customer name",
  "p_customer_phone": "90000000",
  "p_delivery_area": "Area",
  "p_delivery_details": "Building, street, notes",
  "p_items": [
    {
      "product_id": "uuid",
      "quantity": 1
    }
  ]
}
```

## Server-side rules

- `p_items` must be a non-empty JSON array.
- Every item must include `product_id` and integer `quantity`.
- Quantity must be greater than zero.
- All items must belong to the same supplier/company.
- Product price must come from `products.price`; the client must never send price.
- Product must be:
  - `approval_status = approved`
  - `is_visible = true`
  - `is_available = true`
  - linked company `is_active = true`
  - linked company `onboarding_status = activated`
- Quantity must satisfy:
  - `quantity >= min_order_quantity`
  - `quantity <= max_order_quantity` when max is present
- If `track_inventory = true`, stock must be available.
- Stock decrement must happen inside the same transaction as order creation.
- Product volume must support decimals and must remain greater than zero.

## Created order state

- `status = pending`
- `payment_method = cash`
- `payment_status = unpaid`
- `cash_collected_by_driver = false`
- `price = sum(products.price * quantity)`
- `public_code` must be returned to the client.

## Created order items

Each item must snapshot:

- `order_id`
- `product_id`
- `company_id`
- `product_name_snapshot`
- `unit_price`
- `quantity`
- `line_total`

## Output

```json
{
  "order_id": "uuid",
  "public_code": "FLJ-XXXXXXXX",
  "total": 1.5,
  "status": "pending"
}
```

## Client behavior

- Show a generic Arabic error for failed checkout.
- Do not expose raw Supabase/Postgres errors to customers.
- Do not retry automatically if the request may have succeeded; use returned `public_code` or order lookup design.
- Do not clear the cart until the RPC returns success.
- Keep payment copy as Cash on Delivery only.

## Forbidden implementation

- No direct client insert into `orders`.
- No direct client insert into `order_items`.
- No client-supplied price, company id, approval status, or payment status.
- No online payment gateway logic in this COD path.
- No service role key in frontend code.
