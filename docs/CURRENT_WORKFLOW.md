# Falaj Web - Current Mock Workflow

Checkpoint: `Falaj_WebDocs_CurrentMockWorkflow_20260615`

## نطاق المشروع

`Falaj_Web` هو واجهة الويب الحالية المخصصة للشركة والسائق والإدارة فقط.

`Falaj_Claude` هو تطبيق العميل الحالي، ولم يتم لمسه أو تعديله ضمن مراحل واجهة الويب الحالية.

## الصفحات الحالية

- `/company`: لوحة الشركة الرئيسية.
- `/company/orders`: قائمة كل طلبات الشركة.
- `/company/drivers`: قائمة السائقين.
- `/driver`: واجهة السائق mobile-first.
- `/admin`: نظرة عامة للإدارة.

## حالات الطلب

الحالات المستخدمة أو المخطط لها داخل mock workflow:

- `pending`: طلب جديد قيد الانتظار. الواجهة وmock workflow يستخدمان `pending` مباشرة للطلبات الجديدة.
- `accepted`: تم قبول الطلب من الشركة.
- `rejected`: تم رفض الطلب من الشركة.
- `assigned`: تم تعيين الطلب إلى سائق.
- `en_route`: السائق في الطريق.
- `arrived`: السائق وصل.
- `delivered`: تم التسليم.
- `failed`: فشل التسليم.

## حالات الدفع

- `unpaid`: غير مدفوع.
- `paid`: مدفوع.

## طرق الدفع

- `cash`: دفع كاش.
- `card`: دفع بطاقة.

## Workflow الشركة

تعمل صفحات الشركة على بيانات mock محفوظة داخل React state في `src/App.jsx`.

في `/company` تظهر مؤشرات تشغيلية مثل الطلبات الجديدة، الطلبات النشطة، الطلبات المكتملة، كاش اليوم، والكاش غير المحصل.

في `/company` و`/company/orders` يمكن الضغط على الطلب لفتح لوحة تفاصيل الطلب. لوحة التفاصيل تعرض بيانات العميل، العنوان، نوع المياه، الحجم، السعر، حالة الطلب، طريقة الدفع، حالة الدفع، وهل تم استلام الكاش بواسطة السائق.

أزرار الشركة الحالية:

- قبول الطلب: يغير حالة الطلب إلى `accepted`.
- رفض الطلب: يغير حالة الطلب إلى `rejected` ويفصل السائق إن وجد.
- تعيين سائق: يختار سائقًا من `mockDrivers` ويغير حالة الطلب إلى `assigned`.

## Workflow السائق

صفحة `/driver` تعرض الطلبات المسندة للسائق mock الحالي `driver-1`.

واجهة السائق مقسمة إلى:

- الطلب الحالي.
- الطلبات التالية.
- الطلبات المكتملة.

أزرار السائق تغير الحالة داخل React state:

- بدء التوصيل: `assigned` إلى `en_route`.
- وصلت: `en_route` إلى `arrived`.
- تم التسليم: `arrived` إلى `delivered`.
- فشل التسليم: يغير حالة الطلب إلى `failed`.

الأزرار تظهر حسب الحالة المناسبة فقط. مثلًا، زر `وصلت` لا يظهر إلا عندما تكون الحالة `en_route`.

يوجد timeline بسيط يعرض تسلسل:

`assigned -> en_route -> arrived -> delivered`

## Cash Collection

تحصيل الكاش منفصل عن حالة التوصيل.

كل طلب يحتوي على:

- `paymentMethod`: إما `cash` أو `card`.
- `paymentStatus`: إما `unpaid` أو `paid`.
- `cashCollectedByDriver`: يحدد هل السائق استلم الكاش.

زر `استلمت الكاش` في صفحة السائق يظهر فقط إذا:

- `paymentMethod = cash`
- `paymentStatus = unpaid`

بعد الضغط على الزر:

- تتحول `paymentStatus` إلى `paid`.
- تتحول `cashCollectedByDriver` إلى `true`.
- تختفي إمكانية تحصيل الكاش لذلك الطلب.

طلبات `card` لا يظهر لها زر استلام الكاش.

## طبيعة البيانات الحالية

كل شيء حاليًا mock داخل React state.

أي refresh كامل للصفحة يعيد البيانات إلى البداية من `src/data/mockData.js`.

لا يوجد حفظ دائم للبيانات حتى الآن.

## Supabase

Supabase غير مربوط بعد في `Falaj_Web`.

لا توجد قراءة أو كتابة حقيقية إلى قاعدة بيانات في هذه المرحلة.

## الملفات المهمة

- `src/App.jsx`: مصدر mock state الرئيسي ومسؤول عن تحديث حالات الطلب والدفع.
- `src/data/mockData.js`: بيانات الطلبات والسائقين المؤقتة.
- `src/components/OrderDetailsPanel.jsx`: لوحة تفاصيل الطلب وإجراءات الشركة.
- `src/components/OrderTable.jsx`: جدول وبطاقات الطلبات وشارات الحالة والدفع.
- `src/pages/DriverPage.jsx`: workflow السائق وتحديث حالات التوصيل والتحصيل.
- `src/pages/CompanyDashboard.jsx`: مؤشرات لوحة الشركة وجدول الطلبات الجديدة.
- `src/pages/AdminPage.jsx`: مؤشرات الإدارة العامة للدفع والطلبات.

## Database draft created but not connected

تم إنشاء مسودة أولية لقاعدة البيانات في:

`supabase/migrations/0001_initial_schema.sql`

المسودة تحتوي على الجداول التالية:

- `profiles`
- `companies`
- `service_areas`
- `drivers`
- `addresses`
- `orders`
- `order_status_history`
- `ratings`

هذه المسودة مخصصة للتخطيط فقط في هذه المرحلة. لم يتم ربط Supabase بتطبيق React، ولم يتم تثبيت `@supabase/supabase-js`، ولا توجد أي قراءة أو كتابة حقيقية من الواجهة إلى قاعدة البيانات.

لم تتم إضافة RLS policies بعد. سيتم تصميم سياسات الوصول لاحقًا بعد تثبيت أدوار المستخدمين ومسارات العمل النهائية.

## Schema fixes before seed

تم تحديث مسودة schema قبل إنشاء `seed.sql` بالتعديلات التالية:

- توحيد أسماء الأعمدة:
  - `companies.owner_profile_id` أصبح `owner_id`.
  - `orders.customer_profile_id` أصبح `customer_id`.
  - `addresses.customer_profile_id` أصبح `customer_id`.
  - `drivers.current_lat/current_lng` أصبحت `last_lat/last_lng`.
  - `ratings.rating` أصبح `stars`.
- إضافة snapshots في جدول `orders`:
  - `customer_name_snapshot`
  - `customer_phone_snapshot`
- إضافة حقول تحصيل الكاش:
  - `cash_collected_at`
  - `cash_collected_by_driver_id`
- إضافة قيود تحقق للقيم المهمة:
  - السعر لا يكون سالبًا.
  - حجم المياه أكبر من صفر.
  - سعة مركبة السائق أكبر من صفر إن وجدت.
  - نصف قطر منطقة الخدمة أكبر من صفر إن وجد.
  - التقييم بين 1 و5.
  - خطوط العرض والطول ضمن الحدود الجغرافية الصحيحة.
- تم توضيح أن `profiles.id` مصمم لاحقًا ليطابق `auth.users.id` عند ربط Supabase Auth، بدون إضافة FK الآن.

هذه التعديلات لا تربط Supabase بالتطبيق ولا تضيف RLS ولا تغيّر كود React.

## Final naming before seed

تم توحيد تسمية العميل في جدول `ratings` أيضًا:

- `ratings.customer_profile_id` أصبح `ratings.customer_id`.

العلاقة ما زالت تشير إلى `profiles(id)`.

## Seed draft created

تم إنشاء ملف seed مبدئي في:

`supabase/seed.sql`

الملف يحتوي على بيانات تجربة فقط:

- أربعة profiles: عميل، مالك شركة، سائق، وأدمن.
- شركة واحدة.
- منطقة خدمة للبريمي.
- سائق واحد مرتبط بالشركة.
- عنوان واحد للعميل.
- ستة طلبات بحالات مختلفة من workflow.
- مزيج من طرق الدفع `cash` و`card`.
- مزيج من حالات الدفع `paid` و`unpaid`.
- سجل status history لبعض الطلبات.
- تقييم واحد لطلب مكتمل.

هذا seed غير مربوط بالواجهة بعد. تطبيق React ما زال يستخدم mock state من `src/data/mockData.js`، ولا توجد قراءة أو كتابة حقيقية من Supabase في هذه المرحلة.

## Services layer prepared

تم تجهيز طبقة services مبدئية داخل:

`src/services`

الملفات الحالية:

- `src/services/orderService.js`
- `src/services/driverService.js`
- `src/services/companyService.js`
- `src/services/adminService.js`

هذه الخدمات تستخدم mock data وReact state الحالي فقط، ولا تتصل بـ Supabase حتى الآن.

الهدف من هذه الطبقة هو نقل منطق القراءة والتصفية والحسابات خارج الصفحات تدريجيًا، مثل:

- قراءة الطلبات.
- قراءة طلبات الشركة.
- قراءة طلبات السائق.
- قراءة السائقين.
- حساب مؤشرات لوحة الشركة.
- حساب مؤشرات الإدارة.

لاحقًا، ستكون هذه الخدمات نقطة الاستبدال الطبيعية عند ربط Supabase، بحيث يتم تغيير مصدر البيانات داخل services بدل نشر منطق Supabase داخل الصفحات.

## Services API contract

تم إنشاء توثيق مستقل لعقد طبقة الخدمات في:

`docs/SERVICES_API_CONTRACT.md`

يوضح الملف أن services الحالية تعمل على mock data وReact state فقط، ويشرح دوال `orderService` و`driverService` و`companyService` و`adminService`، مع mapping مبدئي بين mock objects وجداول Supabase المستقبلية.

## Mock phase close report

تم إنشاء تقرير إغلاق مرحلة mock في:

`docs/MOCK_PHASE_CLOSE_REPORT.md`

يلخص التقرير الوضع الحالي للمشروع، الصفحات الموجودة، workflows التي تعمل mock، حالة Supabase، طبقة services، القرارات المعتمدة، والخطوة التالية المقترحة قبل الربط الحقيقي.

## Product Catalog foundation

تمت إضافة أساس كتالوج المنتجات للشركة:

- جدول `products` في schema draft.
- بيانات products في `supabase/seed.sql`.
- `mockProducts` في `src/data/mockData.js`.
- خدمة `src/services/productService.js`.
- صفحة `/company/products` لإدارة المنتجات والأسعار بشكل mock.
- توثيق مستقل في `docs/PRODUCT_CATALOG_CONTRACT.md`.

الهدف أن تصبح المنتجات لاحقًا مصدرًا مشتركًا: الشركة تديرها من `Falaj_Web`، والزبون يراها في `Falaj_Claude` من جدول `products`. لا يوجد ربط Supabase فعلي حتى الآن.
