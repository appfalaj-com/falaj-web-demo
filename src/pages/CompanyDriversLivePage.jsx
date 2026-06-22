export default function CompanyDriversLivePage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">متابعة السائقين</p>
          <h1>التتبع المباشر لسائقي الشركة</h1>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>التتبع المباشر غير متوفر حتى يبدأ السائق مشاركة موقعه.</h2>
            <p>لن تظهر أي بيانات مواقع أو سائقين قبل وجود مشاركة موقع آمنة من السائق.</p>
          </div>
        </div>
        <div className="empty-state">
          <strong>لا توجد مواقع مباشرة حاليًا</strong>
          <span>التتبع المباشر غير متوفر حتى يبدأ السائق مشاركة موقعه.</span>
        </div>
      </section>
    </div>
  );
}
