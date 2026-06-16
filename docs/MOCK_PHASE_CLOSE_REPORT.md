# Falaj Web - Mock Phase Close Report

Checkpoint: `Falaj_WebMockPhase_CloseReport_20260615`

## 1. الوضع الحالي للمشروع

`Falaj_Web` هو مشروع ويب مبني بـ React + Vite وJavaScript، ومخصص حاليًا لواجهات الشركة والسائق والإدارة فقط.

المشروع يعمل حاليًا ببيانات mock داخل React state، ولا يوجد ربط فعلي مع Supabase أو أي قاعدة بيانات.

`Falaj_Claude` هو تطبيق العميل الحالي، ولم يتم لمسه أو تعديله ضمن مرحلة `Falaj_Web`.

الواجهة الحالية:

- عربية وRTL.
- تستخدم ألوان Falaj المعتمدة:
  - `#129990`
  - `#096B68`
  - `#90D1CA`
  - `#FFFBDE`
- مناسبة للجوال، وتم فحص عدم وجود horizontal overflow على عرض `375px`.
- لا تستخدم Tailwind.
- لا تستخدم Router package حاليًا؛ التنقل داخلي بسيط داخل `src/App.jsx`.

## 2. الصفحات الموجودة

الصفحات الحالية داخل `Falaj_Web`:

- `/company`: لوحة تشغيل الشركة.
- `/company/orders`: كل طلبات الشركة.
- `/company/drivers`: قائمة السائقين.
- `/driver`: واجهة السائق mobile-first.
- `/admin`: نظرة عامة للإدارة.

## 3. Workflows تعمل حاليًا كـ mock

كل workflows التالية تعمل داخل React state فقط، وتعود إلى بيانات البداية عند refresh كامل للصفحة.

### Workflow الشركة

- الشركة تستطيع قبول الطلب.
- قبول الطلب يغيّر حالة الطلب إلى `accepted`.
- الشركة تستطيع رفض الطلب.
- رفض الطلب يغيّر حالة الطلب إلى `rejected` ويفصل السائق إن وجد.
- الشركة تستطيع تعيين سائق.
- تعيين السائق يختار سائقًا من `mockDrivers` ويغيّر حالة الطلب إلى `assigned`.

### Workflow السائق

صفحة `/driver` تعرض الطلبات المسندة للسائق mock الحالي.

الأزرار تغيّر حالة الطلب داخل React state:

- بدء التوصيل: `assigned` -> `en_route`
- وصلت: `en_route` -> `arrived`
- تم التسليم: `arrived` -> `delivered`
- فشل التسليم: أي طلب نشط -> `failed`

الأزرار تظهر حسب الحالة المناسبة فقط.

### Cash collection

تحصيل الكاش منفصل عن حالة التوصيل.

زر `استلمت الكاش` يظهر في صفحة السائق فقط إذا:

- `paymentMethod = cash`
- `paymentStatus = unpaid`

بعد الضغط:

- `paymentStatus` تصبح `paid`.
- `cashCollectedByDriver` تصبح `true`.

طلبات `card` لا يظهر لها زر تحصيل الكاش.

### مؤشرات الشركة

لوحة `/company` تعرض مؤشرات mock:

- الطلبات الجديدة.
- الطلبات النشطة.
- الطلبات المكتملة.
- كاش اليوم.
- كاش غير محصل.

### مؤشرات الإدارة

صفحة `/admin` تعرض مؤشرات overview:

- إجمالي الطلبات.
- المدفوع.
- غير المدفوع.
- الكاش غير المحصل.

## 4. حالة Supabase

Supabase غير مربوط بالواجهة حتى الآن.

تم تجهيز draft schema في:

`supabase/migrations/0001_initial_schema.sql`

الجداول الموجودة في schema:

- `profiles`
- `companies`
- `service_areas`
- `drivers`
- `addresses`
- `orders`
- `order_status_history`
- `ratings`

تم تجهيز seed مبدئي في:

`supabase/seed.sql`

الـ seed يحتوي بيانات تجربة تشمل profiles، شركة، service area، driver، address، orders بحالات مختلفة، status history، وrating.

الاختبار المحلي لـ Supabase مؤجل لأن البيئة الحالية لا تحتوي على:

- Supabase CLI في PATH.
- Docker متاح للتشغيل المحلي.

لم تتم إضافة RLS policies بعد.

## 5. Services layer

تم تجهيز طبقة services داخل:

`src/services`

الملفات الحالية:

- `src/services/orderService.js`
- `src/services/driverService.js`
- `src/services/companyService.js`
- `src/services/adminService.js`

هذه الطبقة تستخدم حاليًا mock data وReact state فقط.

الغرض منها أن تكون نقطة الاستبدال لاحقًا عند ربط Supabase، بحيث يتم تغيير مصدر البيانات داخل services بدل نشر منطق Supabase داخل الصفحات.

تم توثيق العقد المبدئي للخدمات في:

`docs/SERVICES_API_CONTRACT.md`

## 6. القرارات المعتمدة

- `Falaj_Claude` هو تطبيق العميل الحالي.
- `Falaj_Web` هو واجهة الشركة والسائق والإدارة.
- حالة الطلب الجديدة داخليًا هي `pending` بدل `new`.
- النص الظاهر للمستخدم للطلبات الجديدة يبقى عربيًا: `جديد` أو `الطلبات الجديدة`.
- لا يوجد RLS حتى الآن.
- لا يوجد ربط Supabase حتى الآن.
- لا يوجد `@supabase/supabase-js` مثبت.
- لا يوجد Router package مضاف.
- لا يوجد Tailwind.
- لا يتم تعديل تصميم Falaj أو ألوانه أو RTL ضمن هذه المرحلة.

## 7. آخر checkpoints المهمة

- `Falaj_WebDashboard_InitialMock_20260615`
- `Falaj_WebDashboard_MobileResponsiveOrders_20260615`
- `Falaj_WebDashboard_OrderWorkflowMock_20260615`
- `Falaj_WebDriverWorkflow_MockStatusUpdates_20260615`
- `Falaj_WebCashAndPaymentWorkflow_Mock_20260615`
- `Falaj_WebDocs_CurrentMockWorkflow_20260615`
- `Falaj_WebSupabaseSchema_DraftOnly_20260615`
- `Falaj_WebSupabaseSchema_SmallFixesBeforeSeed_20260615`
- `Falaj_WebSupabaseSchema_FinalNamingBeforeSeed_20260615`
- `Falaj_WebSupabaseSeed_DraftOnly_20260615`
- `Falaj_WebSupabaseLocalTest_20260615`
- `Falaj_WebSupabaseSeed_ReviewOnly_20260615`
- `Falaj_WebServicesLayer_MockAdapter_20260615`
- `Falaj_WebServicesApiContract_Docs_20260615`
- `Falaj_WebStatusNaming_UnifyPending_20260615`
- `Falaj_WebMockPhase_CloseReport_20260615`

## 8. الخطوة التالية المقترحة

الخيار الآمن التالي هو أحد مسارين:

1. تجهيز Docker وSupabase CLI محليًا، ثم تشغيل migration وseed محليًا.
2. إنشاء Supabase hosted project، ثم تطبيق schema وseed هناك.

بعد نجاح قاعدة البيانات، الخطوة التقنية التالية المقترحة:

- ربط read-only من داخل services فقط.
- عدم نقل منطق Supabase إلى الصفحات.
- البدء بقراءة الطلبات والسائقين فقط.
- إبقاء أزرار workflow على mock أو تعطيل الكتابة مؤقتًا إلى أن يتم تصميم write actions وRLS.

## 9. حدود هذه المرحلة

هذه المرحلة تغلق mock phase فقط.

لم يتم في هذا checkpoint:

- تعديل React.
- تعديل CSS.
- تعديل schema.
- تعديل seed.
- ربط Supabase.
- تثبيت packages.
- تعديل `Falaj_Claude`.

## 10. Product Catalog foundation

تمت إضافة أساس Product Catalog بعد إغلاق mock phase:

- جدول `products` أضيف إلى schema draft.
- منتجات مبدئية أضيفت إلى `supabase/seed.sql`.
- `mockProducts` أضيفت إلى mock data.
- `productService` أصبح نقطة قراءة المنتجات حاليًا من mock ولاحقًا من Supabase.
- صفحة `/company/products` تعرض المنتجات والأسعار ومؤشرات التوفر.
- `docs/PRODUCT_CATALOG_CONTRACT.md` يوضح العلاقة المستقبلية بين `Falaj_Web` و`Falaj_Claude`.

لا يوجد ربط Supabase فعلي، ولا يوجد RLS، ولا يوجد تعديل على `Falaj_Claude` ضمن هذه الخطوة.
