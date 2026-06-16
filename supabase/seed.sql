-- Falaj Web - draft seed data.
-- Checkpoint: Falaj_WebSupabaseSeed_DraftOnly_20260615
-- This file is for local testing only. It does not create auth.users and is not
-- connected to the React UI yet.

-- ---------------------------------------------------------------------------
-- Stable IDs used across this seed.
-- ---------------------------------------------------------------------------
-- profiles
-- customer:      11111111-1111-4111-8111-111111111111
-- company owner: 22222222-2222-4222-8222-222222222222
-- driver user:   33333333-3333-4333-8333-333333333333
-- admin:         44444444-4444-4444-8444-444444444444
--
-- company:       aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
-- service area:  bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
-- products:      e0000000-0000-4000-8000-000000000001 .. 0004
-- driver:        cccccccc-cccc-4ccc-8ccc-cccccccccccc
-- address:       dddddddd-dddd-4ddd-8ddd-dddddddddddd

-- ---------------------------------------------------------------------------
-- profiles: one customer, one company owner, one driver, and one admin.
-- ---------------------------------------------------------------------------
insert into profiles (id, full_name, phone, email, account_type, avatar_url)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'عبدالله الكعبي',
    '968 9123 4455',
    'customer@falaj.test',
    'customer',
    null
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'مالك شركة فلج',
    '968 9000 1111',
    'owner@falaj.test',
    'company',
    null
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'سالم البلوشي',
    '968 9900 1122',
    'driver@falaj.test',
    'driver',
    null
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'مدير فلج',
    '968 9000 0000',
    'admin@falaj.test',
    'admin',
    null
  );

-- ---------------------------------------------------------------------------
-- companies: one water supplier company, close to the current mock UI.
-- ---------------------------------------------------------------------------
insert into companies (
  id,
  owner_id,
  name,
  commercial_registration_number,
  phone,
  email,
  logo_url,
  is_active
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '22222222-2222-4222-8222-222222222222',
  'فلج للمياه',
  'OM-FALAJ-1001',
  '968 9000 1111',
  'company@falaj.test',
  null,
  true
);

-- ---------------------------------------------------------------------------
-- service_areas: Al Buraimi coverage area for the company.
-- ---------------------------------------------------------------------------
insert into service_areas (
  id,
  company_id,
  name,
  center_lat,
  center_lng,
  radius_km,
  is_active
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'البريمي',
  24.2509,
  55.7931,
  25.00,
  true
);

-- ---------------------------------------------------------------------------
-- products: draft company catalog that will later feed the customer marketplace.
-- ---------------------------------------------------------------------------
insert into products (
  id,
  company_id,
  name_ar,
  name_en,
  category,
  water_type,
  size_label,
  volume_liters,
  price,
  image_url,
  image_path,
  is_available,
  delivery_estimate,
  description,
  sort_order
)
values
  (
    'e0000000-0000-4000-8000-000000000001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'مياه شرب 500مل',
    'Drinking Water 500ml',
    'bottled_water',
    'مياه شرب',
    '500مل',
    500,
    0.150,
    'https://picsum.photos/seed/falaj-500ml/480/360',
    'product-images/falaj-500ml.png',
    true,
    '20-30 دقيقة',
    'عبوة مياه شرب صغيرة مناسبة للاستخدام اليومي.',
    10
  ),
  (
    'e0000000-0000-4000-8000-000000000002',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'مياه شرب 1.5 لتر',
    'Drinking Water 1.5L',
    'bottled_water',
    'مياه شرب',
    '1.5 لتر',
    1500,
    0.350,
    'https://picsum.photos/seed/falaj-1500ml/480/360',
    'product-images/falaj-1500ml.png',
    true,
    '20-30 دقيقة',
    'عبوة عائلية من مياه الشرب للاستخدام المنزلي.',
    20
  ),
  (
    'e0000000-0000-4000-8000-000000000003',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'صهريج مياه شرب 1000 لتر',
    'Drinking Water Tanker 1000L',
    'tanker',
    'مياه شرب',
    '1000 لتر',
    1000,
    12.500,
    'https://picsum.photos/seed/falaj-tanker-1000/480/360',
    'product-images/falaj-tanker-1000.png',
    true,
    '45-60 دقيقة',
    'توصيل صهريج مياه شرب للمنازل والمزارع الصغيرة.',
    30
  ),
  (
    'e0000000-0000-4000-8000-000000000004',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'صهريج مياه زراعية 2000 لتر',
    'Agricultural Water Tanker 2000L',
    'tanker',
    'مياه زراعية',
    '2000 لتر',
    2000,
    22.000,
    'https://picsum.photos/seed/falaj-farm-2000/480/360',
    'product-images/falaj-farm-2000.png',
    false,
    '60-90 دقيقة',
    'صهريج مياه زراعية للحدائق والمزارع، متاح حسب توفر السائقين.',
    40
  );

-- ---------------------------------------------------------------------------
-- drivers: one driver linked to the company and driver profile.
-- ---------------------------------------------------------------------------
insert into drivers (
  id,
  company_id,
  profile_id,
  name,
  phone,
  vehicle_plate,
  vehicle_label,
  capacity_liters,
  is_active,
  is_online,
  last_lat,
  last_lng
)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '33333333-3333-4333-8333-333333333333',
  'سالم البلوشي',
  '968 9900 1122',
  'B-12345',
  'ناقلة 3000 لتر',
  3000,
  true,
  true,
  24.2509,
  55.7931
);

-- ---------------------------------------------------------------------------
-- addresses: one saved customer delivery address.
-- ---------------------------------------------------------------------------
insert into addresses (
  id,
  customer_id,
  label,
  area,
  details,
  lat,
  lng,
  is_default
)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '11111111-1111-4111-8111-111111111111',
  'البيت',
  'البريمي',
  'قرب السوق المركزي',
  24.2509,
  55.7931,
  true
);

-- ---------------------------------------------------------------------------
-- orders: six orders across the current draft status and payment workflows.
-- ---------------------------------------------------------------------------
insert into orders (
  id,
  public_code,
  customer_id,
  customer_name_snapshot,
  customer_phone_snapshot,
  company_id,
  driver_id,
  address_id,
  water_type,
  volume_liters,
  delivery_area,
  delivery_details,
  delivery_lat,
  delivery_lng,
  status,
  payment_method,
  payment_status,
  cash_collected_by_driver,
  cash_collected_at,
  cash_collected_by_driver_id,
  price,
  notes,
  accepted_at,
  assigned_at,
  en_route_at,
  arrived_at,
  delivered_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'FLJ-1042',
    '11111111-1111-4111-8111-111111111111',
    'عبدالله الكعبي',
    '968 9123 4455',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    null,
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'مياه شرب',
    1000,
    'البريمي',
    'قرب السوق المركزي',
    24.2509,
    55.7931,
    'pending',
    'cash',
    'unpaid',
    false,
    null,
    null,
    12.500,
    'يرجى الاتصال قبل الوصول بخمس دقائق.',
    null,
    null,
    null,
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'FLJ-1041',
    '11111111-1111-4111-8111-111111111111',
    'عبدالله الكعبي',
    '968 9123 4455',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    null,
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'مياه منزلية',
    2000,
    'البريمي',
    'قرب السوق المركزي',
    24.2509,
    55.7931,
    'accepted',
    'card',
    'paid',
    false,
    null,
    null,
    22.000,
    'الدفع بالبطاقة.',
    now() - interval '2 hours',
    null,
    null,
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'FLJ-1040',
    '11111111-1111-4111-8111-111111111111',
    'عبدالله الكعبي',
    '968 9123 4455',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'مياه زراعية',
    5000,
    'البريمي',
    'قرب المزرعة',
    24.2600,
    55.8000,
    'assigned',
    'cash',
    'unpaid',
    false,
    null,
    null,
    45.000,
    'الخزان خلف البيت.',
    now() - interval '3 hours',
    now() - interval '2 hours 30 minutes',
    null,
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'FLJ-1039',
    '11111111-1111-4111-8111-111111111111',
    'عبدالله الكعبي',
    '968 9123 4455',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'مياه شرب',
    1000,
    'البريمي',
    'حي النهضة',
    24.2515,
    55.7905,
    'en_route',
    'cash',
    'unpaid',
    false,
    null,
    null,
    13.000,
    'يفضل التوصيل قبل الظهر.',
    now() - interval '4 hours',
    now() - interval '3 hours 30 minutes',
    now() - interval '45 minutes',
    null,
    null
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'FLJ-1038',
    '11111111-1111-4111-8111-111111111111',
    'عبدالله الكعبي',
    '968 9123 4455',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'مياه منزلية',
    3000,
    'البريمي',
    'طريق الواحة',
    24.2550,
    55.7970,
    'arrived',
    'cash',
    'unpaid',
    false,
    null,
    null,
    31.000,
    'السائق وصل وينتظر التحصيل.',
    now() - interval '5 hours',
    now() - interval '4 hours 30 minutes',
    now() - interval '1 hour',
    now() - interval '10 minutes',
    null
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'FLJ-1037',
    '11111111-1111-4111-8111-111111111111',
    'عبدالله الكعبي',
    '968 9123 4455',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'مياه شرب',
    1500,
    'البريمي',
    'قرب المدرسة',
    24.2480,
    55.7880,
    'delivered',
    'cash',
    'paid',
    true,
    now() - interval '30 minutes',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    18.000,
    'تم التسليم واستلام الكاش.',
    now() - interval '6 hours',
    now() - interval '5 hours 30 minutes',
    now() - interval '2 hours',
    now() - interval '1 hour 15 minutes',
    now() - interval '40 minutes'
  );

-- ---------------------------------------------------------------------------
-- order_status_history: sample status timeline rows for selected orders.
-- ---------------------------------------------------------------------------
insert into order_status_history (id, order_id, status, changed_by_profile_id, note, created_at)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    'accepted',
    '22222222-2222-4222-8222-222222222222',
    'Company accepted the order.',
    now() - interval '3 hours'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    'assigned',
    '22222222-2222-4222-8222-222222222222',
    'Assigned to Salem.',
    now() - interval '2 hours 30 minutes'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    'en_route',
    '33333333-3333-4333-8333-333333333333',
    'Driver started delivery.',
    now() - interval '45 minutes'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000005',
    'arrived',
    '33333333-3333-4333-8333-333333333333',
    'Driver arrived at delivery location.',
    now() - interval '10 minutes'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000006',
    'delivered',
    '33333333-3333-4333-8333-333333333333',
    'Delivered and cash collected.',
    now() - interval '40 minutes'
  );

-- ---------------------------------------------------------------------------
-- ratings: one rating for a delivered order.
-- ---------------------------------------------------------------------------
insert into ratings (
  id,
  order_id,
  customer_id,
  company_id,
  driver_id,
  stars,
  comment
)
values (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000006',
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  5,
  'توصيل سريع وتعامل ممتاز.'
);
