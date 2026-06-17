-- Falaj Web - hosted demo Arabic text fix.
-- Checkpoint: Falaj_SupabaseHosted_ArabicDemoDataFixSQL_20260615
-- Purpose: fix mojibake Arabic demo text already inserted in Supabase Hosted.
-- Safe scope: update text fields only. No schema changes, deletes, truncates, or drops.

-- ---------------------------------------------------------------------------
-- profiles.full_name
-- ---------------------------------------------------------------------------
update profiles
set full_name = 'عبدالله الكعبي'
where id = '11111111-1111-4111-8111-111111111111';

update profiles
set full_name = 'مالك شركة فلج'
where id = '22222222-2222-4222-8222-222222222222';

update profiles
set full_name = 'سالم البلوشي'
where id = '33333333-3333-4333-8333-333333333333';

update profiles
set full_name = 'مدير فلج'
where id = '44444444-4444-4444-8444-444444444444';

-- ---------------------------------------------------------------------------
-- companies.name
-- ---------------------------------------------------------------------------
update companies
set name = 'فلج للمياه'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- ---------------------------------------------------------------------------
-- service_areas.name
-- ---------------------------------------------------------------------------
update service_areas
set name = 'البريمي'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

-- ---------------------------------------------------------------------------
-- products catalog Arabic fields
-- ---------------------------------------------------------------------------
update products
set
  name_ar = 'مياه شرب 500مل',
  water_type = 'مياه شرب',
  size_label = '500مل',
  delivery_estimate = '20-30 دقيقة',
  description = 'عبوة مياه شرب صغيرة مناسبة للاستخدام اليومي.'
where id = 'e0000000-0000-4000-8000-000000000001';

update products
set
  name_ar = 'مياه شرب 1.5 لتر',
  water_type = 'مياه شرب',
  size_label = '1.5 لتر',
  delivery_estimate = '20-30 دقيقة',
  description = 'عبوة عائلية من مياه الشرب للاستخدام المنزلي.'
where id = 'e0000000-0000-4000-8000-000000000002';

update products
set
  name_ar = 'صهريج مياه شرب 1000 لتر',
  water_type = 'مياه شرب',
  size_label = '1000 لتر',
  delivery_estimate = '45-60 دقيقة',
  description = 'توصيل صهريج مياه شرب للمنازل والمزارع الصغيرة.'
where id = 'e0000000-0000-4000-8000-000000000003';

update products
set
  name_ar = 'صهريج مياه زراعية 2000 لتر',
  water_type = 'مياه زراعية',
  size_label = '2000 لتر',
  delivery_estimate = '60-90 دقيقة',
  description = 'صهريج مياه زراعية للحدائق والمزارع، متاح حسب توفر السائقين.'
where id = 'e0000000-0000-4000-8000-000000000004';

-- ---------------------------------------------------------------------------
-- drivers Arabic fields
-- ---------------------------------------------------------------------------
update drivers
set
  name = 'سالم البلوشي',
  vehicle_label = 'ناقلة 3000 لتر'
where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

-- ---------------------------------------------------------------------------
-- addresses Arabic fields
-- ---------------------------------------------------------------------------
update addresses
set
  label = 'البيت',
  area = 'البريمي',
  details = 'قرب السوق المركزي'
where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

-- ---------------------------------------------------------------------------
-- orders Arabic snapshot and delivery fields
-- ---------------------------------------------------------------------------
update orders
set
  customer_name_snapshot = 'عبدالله الكعبي',
  water_type = 'مياه شرب',
  delivery_area = 'البريمي',
  delivery_details = 'قرب السوق المركزي',
  notes = 'يرجى الاتصال قبل الوصول بخمس دقائق.'
where public_code = 'FLJ-1042';

update orders
set
  customer_name_snapshot = 'عبدالله الكعبي',
  water_type = 'مياه منزلية',
  delivery_area = 'البريمي',
  delivery_details = 'قرب السوق المركزي',
  notes = 'الدفع بالبطاقة.'
where public_code = 'FLJ-1041';

update orders
set
  customer_name_snapshot = 'عبدالله الكعبي',
  water_type = 'مياه زراعية',
  delivery_area = 'البريمي',
  delivery_details = 'قرب المزرعة',
  notes = 'الخزان خلف البيت.'
where public_code = 'FLJ-1040';

update orders
set
  customer_name_snapshot = 'عبدالله الكعبي',
  water_type = 'مياه شرب',
  delivery_area = 'البريمي',
  delivery_details = 'حي النهضة',
  notes = 'يفضل التوصيل قبل الظهر.'
where public_code = 'FLJ-1039';

update orders
set
  customer_name_snapshot = 'عبدالله الكعبي',
  water_type = 'مياه منزلية',
  delivery_area = 'البريمي',
  delivery_details = 'طريق الواحة',
  notes = 'السائق وصل وينتظر التحصيل.'
where public_code = 'FLJ-1038';

update orders
set
  customer_name_snapshot = 'عبدالله الكعبي',
  water_type = 'مياه شرب',
  delivery_area = 'البريمي',
  delivery_details = 'قرب المدرسة',
  notes = 'تم التسليم واستلام الكاش.'
where public_code = 'FLJ-1037';

-- ---------------------------------------------------------------------------
-- ratings.comment
-- ---------------------------------------------------------------------------
update ratings
set comment = 'توصيل سريع وتعامل ممتاز.'
where id = '30000000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- Verification query to run after the updates.
-- ---------------------------------------------------------------------------
select id, name_ar, water_type, size_label, delivery_estimate
from products
order by sort_order;
