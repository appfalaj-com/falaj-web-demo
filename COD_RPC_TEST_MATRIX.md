# COD RPC Test Matrix

Use only clearly named test data, for example `طلب اختبار - لا يستخدم`. Do not run destructive production commands. Prefer a dedicated test supplier/product.

## Pre-test requirements

- A company with `is_active = true` and `onboarding_status = activated`.
- A product with:
  - `approval_status = approved`
  - `is_visible = true`
  - `is_available = true`
  - `price > 0`
  - `volume_liters > 0`
  - inventory fields configured intentionally.
- A safe authenticated customer/session strategy.

## Matrix

| ID | Scenario | Input | Expected result |
|---|---|---|---|
| COD-001 | Valid single item | One eligible product, quantity 1 | Order created, `payment_method=cash`, `payment_status=unpaid`, order_items row created |
| COD-002 | Empty items | `p_items=[]` | RPC rejects; no order; no stock change |
| COD-003 | Missing product id | Item without `product_id` | RPC rejects; no order |
| COD-004 | Quantity zero | `quantity=0` | RPC rejects; no order |
| COD-005 | Quantity below minimum | Quantity less than `min_order_quantity` | RPC rejects; no order |
| COD-006 | Quantity above maximum | Quantity greater than `max_order_quantity` | RPC rejects; no order |
| COD-007 | Insufficient stock | `track_inventory=true`, requested quantity exceeds stock | RPC rejects; no order; no stock change |
| COD-008 | No stock tracking | `track_inventory=false` | Order created; stock unchanged |
| COD-009 | Pending product | `approval_status=pending_review` | RPC rejects |
| COD-010 | Hidden product | `is_visible=false` | RPC rejects |
| COD-011 | Unavailable product | `is_available=false` | RPC rejects |
| COD-012 | Inactive company | Company inactive | RPC rejects |
| COD-013 | Non-activated company | Company onboarding not activated | RPC rejects |
| COD-014 | Mixed suppliers | Two products from different companies | RPC rejects; no order |
| COD-015 | Decimal volume | Product volume `0.02`, `0.5`, or `1.5` | Order created and volume remains decimal-safe |
| COD-016 | Price authority | Client attempts to send price in item JSON | Ignored; server price used |
| COD-017 | Public code returned | Valid order | `public_code` returned and shown to customer |
| COD-018 | Status history | Valid order | `order_status_history` receives pending entry |
| COD-019 | Admin visibility | Valid test order | Admin can see order and items |
| COD-020 | Company visibility | Valid test order | Owning supplier sees order and items only |
| COD-021 | Driver visibility before assignment | Unassigned order | Driver only sees via available-order RPC if eligible |
| COD-022 | Anon direct read | Anonymous user selects `orders` or `order_items` | Denied/no data |
| COD-023 | Anon direct insert | Anonymous user inserts `orders` | Denied |
| COD-024 | Direct customer table insert | Client tries direct `orders` insert | Denied or unsupported; RPC is only allowed path |

## Acceptance criteria

- Failed scenarios must not create partial orders.
- Failed scenarios must not decrement stock.
- Successful scenarios must create exactly one order and matching order_items.
- Successful COD orders must start as unpaid.
- Non-owning company/driver must not see the order.
