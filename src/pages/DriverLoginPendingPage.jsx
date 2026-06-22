import { useState } from "react";

export default function DriverLoginPendingPage({ onNavigate }) {
  const [permissionState, setPermissionState] = useState("الإذن مطلوب");
  const [position, setPosition] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  function startLocationSharing() {
    setErrorMessage("");

    if (!navigator.geolocation) {
      setPermissionState("غير متاح");
      setErrorMessage("المتصفح لا يدعم تحديد الموقع.");
      return;
    }

    setIsSharing(true);
    setPermissionState("بانتظار موافقة المتصفح");

    navigator.geolocation.getCurrentPosition(
      (location) => {
        setPosition({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          recordedAt: new Date(location.timestamp),
        });
        setPermissionState("تم السماح بالموقع");
        setIsSharing(false);
      },
      (error) => {
        setPosition(null);
        setIsSharing(false);

        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState("تم رفض الإذن");
          setErrorMessage("تم رفض صلاحية الموقع. يمكن تفعيلها من إعدادات المتصفح.");
          return;
        }

        setPermissionState("تعذر تحديد الموقع");
        setErrorMessage(error.message || "تعذر الحصول على الموقع الحالي.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  function stopLocationSharing() {
    setIsSharing(false);
    setPermissionState("متوقف");
  }

  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">ف</span>
          <div>
            <strong>فلج</strong>
            <small>دخول السائقين</small>
          </div>
        </div>
        <h1>مشاركة موقع السائق</h1>
        <p className="pending-copy">
          يمكن للسائق تجربة طلب صلاحية الموقع من المتصفح. ربط حفظ الموقع في Supabase سيتم بعد جاهزية تسجيل دخول السائق.
        </p>

        <dl className="details-list">
          <div>
            <dt>حالة الإذن</dt>
            <dd>{permissionState}</dd>
          </div>
          <div>
            <dt>الموقع الحالي</dt>
            <dd>
              {position
                ? `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
                : "لم يتم تحديد الموقع بعد"}
            </dd>
          </div>
          <div>
            <dt>الدقة</dt>
            <dd>{position ? `${Math.round(position.accuracy)} متر` : "-"}</dd>
          </div>
          <div>
            <dt>آخر تحديث</dt>
            <dd>{position ? position.recordedAt.toLocaleString("ar-OM") : "-"}</dd>
          </div>
        </dl>

        {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}
        <p className="auth-alert">
          حفظ الموقع غير مفعّل حاليًا لأن Driver Auth لم يجهز بعد، ولا يوجد public insert آمن.
        </p>

        <div className="row-actions">
          <button type="button" onClick={startLocationSharing} disabled={isSharing}>
            {isSharing ? "جاري طلب الموقع..." : "بدء مشاركة الموقع"}
          </button>
          <button type="button" className="ghost" onClick={stopLocationSharing}>
            إيقاف المشاركة
          </button>
        </div>

        <button type="button" className="ghost" onClick={() => onNavigate?.("/")}>
          العودة للصفحة الرئيسية
        </button>
      </section>
    </main>
  );
}
