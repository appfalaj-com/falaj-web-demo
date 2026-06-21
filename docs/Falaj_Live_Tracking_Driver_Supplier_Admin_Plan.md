# Falaj Live Tracking Driver Supplier Admin Plan

## Scope

This phase prepares the tracking foundation without enabling heavy GPS or background tracking.

No changes were made to `Falaj_Claude`, Cart, Checkout, or Payment.

## Tracking Concept

Driver tracking should start only when a driver is assigned to an active delivery and explicitly permits location access.

Tracking should stop when:

- the order is delivered,
- delivery fails,
- the order is cancelled,
- the driver goes offline,
- the driver revokes location permission.

## Who Can See Driver Location

Admin:

- can see active orders and active drivers across the platform.

Supplier/company:

- can see only drivers belonging to its own `company_id`.
- cannot see drivers from other companies.

Driver:

- can write its own location rows when `drivers.profile_id = auth.uid()`.

Customer:

- customer-facing tracking should be added later with order-scoped visibility.

## Database Foundation

Migration:

`supabase/migrations/0003_admin_finance_tracking.sql`

Tables:

- `driver_locations`
- `driver_delivery_schedule`

Safe order fields:

- `delivery_status`
- `picked_up_at`
- `on_the_way_at`
- `estimated_arrival_minutes`
- `last_driver_location_id`

Existing order lifecycle columns such as `driver_id`, `arrived_at`, `delivered_at`, and `cancelled_at` are reused.

## Supplier Tracking Page

Route:

- `/company/drivers/live`

Shows:

- company drivers only,
- each driver status,
- current order,
- delivered item,
- customer and area,
- expected arrival placeholder,
- today's delivery table,
- clear empty state: `لا يوجد تتبع نشط حاليًا`.

## Admin Tracking Page

Route:

- `/admin/live-tracking`

Shows:

- current active orders,
- active drivers,
- filter by supplier,
- filter by order status,
- delayed orders foundation,
- last known location placeholder,
- last update placeholder.

## Driver Page

Route:

- `/driver`

The current driver UI now supports:

- today's orders,
- assigned orders,
- current order,
- order status,
- buttons for accepting, picking up, starting delivery, arriving, delivering, and failed delivery.

GPS is not started automatically. The UI includes a placeholder for requesting location permission later.

## GPS Constraints

Real GPS tracking needs either:

- a dedicated driver app with background location permissions, or
- Web GPS with browser permission constraints and foreground limitations.

Background tracking from a normal web page is not reliable across mobile browsers, so this phase intentionally prepares the structure without pretending GPS is production-ready.
