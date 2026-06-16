# Falaj Web - Services API Contract

Checkpoint: `Falaj_WebServicesApiContract_Docs_20260615`

## Overview / نظرة عامة

`Falaj_Web` currently uses local mock data and React state only. The services in `src/services` are lightweight adapters for reading, filtering, grouping, and calculating metrics from that mock state.

حاليًا تعتمد طبقة الخدمات على `src/data/mockData.js` والـ state الموجود في `src/App.jsx`. لا يوجد اتصال فعلي مع Supabase، ولا توجد قراءة أو كتابة من قاعدة بيانات.

لاحقًا، ستكون هذه الخدمات نقطة الاستبدال الطبيعية عند ربط Supabase. الهدف أن تبقى الصفحات تستدعي services قدر الإمكان، ويتم تغيير مصدر البيانات داخل services بدل نشر منطق Supabase داخل الصفحات.

Current services:

- `orderService`
- `driverService`
- `companyService`
- `adminService`

## Current Data Source

- Mock orders: `src/data/mockData.js -> mockOrders`
- Mock drivers: `src/data/mockData.js -> mockDrivers`
- Runtime order updates: `src/App.jsx -> orders` React state
- Runtime workflow actions: `src/App.jsx`

Important note:

- The current UI mock now uses `status: "pending"` directly for new orders.
- The Supabase schema also uses `pending` as the canonical database value.

## orderService

File: `src/services/orderService.js`

### `getOrders(orders = mockOrders)`

Inputs:

- `orders`: optional array of order objects. Defaults to `mockOrders`.

Outputs:

- Returns the same orders array.

Used by:

- `src/App.jsx`

Future Supabase table:

- `orders`

### `getOrdersByCompany(companyId, orders = mockOrders)`

Inputs:

- `companyId`: company identifier.
- `orders`: optional array of order objects. Defaults to `mockOrders`.

Outputs:

- Returns orders where `order.companyId === companyId`.
- Also keeps orders with no `companyId` because current mock orders may not include company ownership yet.

Used by:

- `src/services/companyService.js`

Future Supabase table:

- `orders`
- Expected filter: `orders.company_id = companyId`

### `getOrdersByDriver(driverId, orders = mockOrders)`

Inputs:

- `driverId`: driver identifier.
- `orders`: optional array of order objects. Defaults to `mockOrders`.

Outputs:

- Returns orders assigned to the driver.
- Excludes rejected orders.

Used by:

- `src/services/driverService.js`

Future Supabase table:

- `orders`
- Expected filter: `orders.driver_id = driverId`

### `getNewOrders(orders = mockOrders)`

Inputs:

- `orders`: optional array of order objects. Defaults to `mockOrders`.

Outputs:

- Returns orders with `status === "pending"`.

Used by:

- `src/services/companyService.js`

Future Supabase table:

- `orders`
- Expected filter: `orders.status = 'pending'`

### `getActiveOrders(orders = mockOrders)`

Inputs:

- `orders`: optional array of order objects. Defaults to `mockOrders`.

Outputs:

- Returns orders with status in `active`, `accepted`, `assigned`, `en_route`, or `arrived`.

Used by:

- `src/services/companyService.js`

Future Supabase table:

- `orders`

Notes:

- `active` is a legacy/mock-compatible status only.
- Canonical Supabase active statuses are `accepted`, `assigned`, `en_route`, and `arrived`.

### `getCompletedOrders(orders = mockOrders)`

Inputs:

- `orders`: optional array of order objects. Defaults to `mockOrders`.

Outputs:

- Returns orders with `status === "completed"` or `status === "delivered"`.

Used by:

- `src/services/companyService.js`

Future Supabase table:

- `orders`

Notes:

- `completed` is a legacy/mock-compatible status only.
- Canonical Supabase completed status is `delivered`.

## driverService

File: `src/services/driverService.js`

### `MOCK_DRIVER_ID`

Value:

- `"driver-1"`

Used by:

- `src/pages/DriverPage.jsx`

Future Supabase mapping:

- Replace with the authenticated driver's `drivers.id` or a profile-to-driver lookup.

### `getDrivers(drivers = mockDrivers)`

Inputs:

- `drivers`: optional array of driver objects. Defaults to `mockDrivers`.

Outputs:

- Returns the same drivers array.

Used by:

- `src/App.jsx`
- `src/pages/CompanyDriversPage.jsx`

Future Supabase table:

- `drivers`

### `getDriverById(driverId, drivers = mockDrivers)`

Inputs:

- `driverId`: driver identifier.
- `drivers`: optional array of driver objects. Defaults to `mockDrivers`.

Outputs:

- Returns the matching driver object.
- Returns `null` if not found.

Used by:

- `src/services/driverService.js`

Future Supabase table:

- `drivers`

### `getDriverWorkflow(driverId, orders, drivers = mockDrivers)`

Inputs:

- `driverId`: driver identifier.
- `orders`: current order state array.
- `drivers`: optional array of driver objects. Defaults to `mockDrivers`.

Outputs:

- Object with `driver`, `currentOrder`, `nextOrders`, and `completedOrders`.

Used by:

- `src/pages/DriverPage.jsx`

Future Supabase tables:

- `drivers`
- `orders`

Notes:

- Active driver statuses are `assigned`, `en_route`, and `arrived`.
- Completed driver statuses are `delivered` and `failed`.

## companyService

File: `src/services/companyService.js`

### `MOCK_COMPANY_ID`

Value:

- `"company-1"`

Used by:

- `src/pages/CompanyOrdersPage.jsx`

Future Supabase mapping:

- Replace with the authenticated company user's `companies.id` or owner membership lookup.

### `getDashboardMetrics(orders)`

Inputs:

- `orders`: current order state array.

Outputs:

- Object with `newOrders`, `activeOrders`, `completedOrders`, `cashToday`, and `uncollectedCash`.

Used by:

- `src/pages/CompanyDashboard.jsx`

Future Supabase tables:

- `orders`

Notes:

- `cashToday` currently sums cash orders where `paymentMethod === "cash"` and `paymentStatus === "paid"`.
- `uncollectedCash` uses `isCashUncollected(order)` from mock data.

### `getCompanyOrders(companyId, orders)`

Inputs:

- `companyId`: company identifier.
- `orders`: current order state array.

Outputs:

- Company-scoped orders from `getOrdersByCompany`.

Used by:

- `src/pages/CompanyOrdersPage.jsx`

Future Supabase table:

- `orders`

## adminService

File: `src/services/adminService.js`

### `getAdminMetrics(orders)`

Inputs:

- `orders`: current order state array.

Outputs:

- Object with `totalOrders`, `paidOrders`, `unpaidOrders`, and `uncollectedCash`.

Used by:

- `src/pages/AdminPage.jsx`

Future Supabase tables:

- `orders`

Notes:

- This is overview-only for the current admin mock page.

## Mock Order to Supabase `orders` Mapping

| Mock field | Supabase column | Notes |
| --- | --- | --- |
| `id` | `public_code` | Mock uses display code like `FLJ-1042`; DB `id` is UUID. |
| `customer` | `customer_name_snapshot` | Display snapshot for order details. |
| `phone` | `customer_phone_snapshot` | Display snapshot and contact fallback. |
| N/A | `customer_id` | Required UUID reference to `profiles(id)` later. |
| N/A or `companyId` | `company_id` | Required UUID reference to `companies(id)` later. |
| `driverId` | `driver_id` | UUID reference to `drivers(id)` later. |
| N/A | `address_id` | Optional UUID reference to `addresses(id)`. |
| `area` | `delivery_area` | Delivery area text. |
| `address` | `delivery_details` | Address details text. |
| `waterType` | `water_type` | Water category. |
| `volume` | `volume_liters` | Mock string must be parsed to integer liters. |
| `amount` | `price` | Numeric order price. |
| `status` | `status` | Use canonical enum mapping below. |
| `paymentMethod` | `payment_method` | `cash` or `card`. |
| `paymentStatus` | `payment_status` | `unpaid` or `paid`. |
| `cashCollectedByDriver` | `cash_collected_by_driver` | Boolean cash collection flag. |
| N/A | `cash_collected_at` | Set when cash is collected. |
| N/A | `cash_collected_by_driver_id` | Driver UUID when cash is collected by driver. |
| `notes` | `notes` | Customer/company notes. |
| `time` | `created_at` or `scheduled_at` | Current mock time is display-only. |

## Status Mapping

Canonical Supabase `order_status` values:

- `pending`: New order waiting for company action.
- `accepted`: Company accepted the order.
- `rejected`: Company rejected the order.
- `assigned`: Order assigned to a driver.
- `en_route`: Driver started delivery.
- `arrived`: Driver arrived at destination.
- `delivered`: Delivery completed.
- `failed`: Delivery failed.
- `cancelled`: Order cancelled.

Mock compatibility:

- The UI mock now uses `pending` directly for new orders.
- `active` -> use one of `accepted`, `assigned`, `en_route`, or `arrived`
- `completed` -> `delivered`

## Payment Mapping

Canonical Supabase values:

- `payment_method`: `cash` or `card`
- `payment_status`: `unpaid` or `paid`
- `cash_collected_by_driver`: boolean

Current mock behavior:

- Cash button appears in `/driver` only when `paymentMethod === "cash"` and `paymentStatus === "unpaid"`.
- After pressing the button, `paymentStatus` becomes `paid` and `cashCollectedByDriver` becomes `true`.

Future Supabase write mapping:

- `paymentMethod` -> `orders.payment_method`
- `paymentStatus` -> `orders.payment_status`
- `cashCollectedByDriver` -> `orders.cash_collected_by_driver`
- authenticated/current driver id -> `orders.cash_collected_by_driver_id`
- current timestamp -> `orders.cash_collected_at`

## Future Replacement Rule

When Supabase is connected later:

- Keep page components calling services.
- Replace mock reads inside services with Supabase queries.
- Keep workflow status names aligned with the schema enum.
- Add write functions deliberately later for accept, reject, assign driver, driver status updates, and cash collection.
- Do not add Supabase logic directly inside pages unless there is a specific reason.

## Product Service / خدمة المنتجات

`productService` was added as the Product Catalog adapter for the marketplace foundation.

Current source: `mockProducts` from `src/data/mockData.js`.

Future Supabase source: `products` table.

Functions:

- `getProductsByCompany(companyId)`: returns all products for one company.
- `getAvailableProductsByCompany(companyId)`: returns only available products.
- `getProductCatalogForCustomer(companyId)`: returns a customer-facing product list for later use in `Falaj_Claude`.
- `getProductMetrics(companyId)`: returns total, available, unavailable, and average price metrics for `/company/products`.

The full product catalog contract is documented in `docs/PRODUCT_CATALOG_CONTRACT.md`.
