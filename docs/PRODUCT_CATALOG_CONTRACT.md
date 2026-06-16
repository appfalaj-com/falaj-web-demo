# Product Catalog Contract / عقد كتالوج المنتجات

## الهدف

`products` هو المصدر المشترك المقترح لاحقًا بين:

- `Falaj_Web`: لوحة الشركة لإدارة المنتجات والأسعار.
- `Falaj_Claude`: تطبيق الزبون لعرض الشركات ومنتجاتها وبدء الطلب.

حاليًا لا يوجد ربط فعلي مع Supabase. كل العرض في الواجهة يعتمد على mock data داخل React/services.

## Current UI

- الشركة تدير المنتجات من صفحة `/company/products`.
- الصفحة تعرض مؤشرات المنتجات، قائمة المنتجات، حالة التوفر، السعر، الحجم، وقت التوصيل، وأزرار شكلية للتعديل والتفعيل والحذف.
- زر "إضافة منتج mock" موجود كإشارة للوظيفة المستقبلية فقط ولا يكتب في قاعدة بيانات.

## Supabase Table

الجدول المقترح:

`products`

الحقول الأساسية:

- `id`
- `company_id`
- `name_ar`
- `name_en`
- `category`
- `water_type`
- `size_label`
- `volume_liters`
- `price`
- `image_url`
- `image_path`
- `is_available`
- `delivery_estimate`
- `description`
- `sort_order`
- `created_at`
- `updated_at`

## Image Storage

لاحقًا، صور المنتجات يفترض أن تكون في Supabase Storage bucket باسم:

`product-images`

الاستخدام المتوقع:

- `image_path`: مسار الملف داخل bucket، مثل `product-images/falaj-500ml.png`.
- `image_url`: رابط جاهز للعرض أو رابط عام/موقّع حسب سياسة التخزين لاحقًا.

لا يوجد bucket فعلي أو upload logic في هذه المرحلة.

## Customer Marketplace Mapping

عندما يتم ربط Supabase لاحقًا:

- الشركة تضيف أو تعدّل المنتجات من `Falaj_Web`.
- الصفوف تحفظ في جدول `products`.
- تطبيق الزبون `Falaj_Claude` يقرأ المنتجات حسب `company_id`.
- المنتجات المتاحة فقط `is_available = true` تظهر للزبون في كتالوج الشركة.

## Services

الخدمة الحالية:

`src/services/productService.js`

الدوال:

- `getProductsByCompany(companyId)`
- `getAvailableProductsByCompany(companyId)`
- `getProductCatalogForCustomer(companyId)`
- `getProductMetrics(companyId)`

هذه الدوال تستخدم `mockProducts` الآن، وستكون نقطة الاستبدال الطبيعية لاحقًا لاستعلامات Supabase.
