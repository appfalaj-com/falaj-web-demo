const companyLinks = [
  { href: "/company", label: "لوحة الشركة" },
  { href: "/company/orders", label: "طلبات الشركة" },
  { href: "/company/products", label: "المنتجات والأسعار" },
  { href: "/company/drivers", label: "السائقون" },
  { href: "/company/drivers/live", label: "متابعة السائقين" },
];

const adminLinks = [
  { href: "/admin", label: "الإدارة" },
  { href: "/admin/suppliers", label: "الموردون" },
  { href: "/admin/finance", label: "المالية" },
  { href: "/admin/live-tracking", label: "التتبع العام" },
];

const driverLinks = [{ href: "/driver", label: "دخول السائق" }];

export default function Layout({
  children,
  companyName,
  currentPath = "/company",
  role,
  onNavigate,
  onSignOut,
}) {
  const links = role === "admin" ? adminLinks : role === "company" ? companyLinks : driverLinks;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="/"
          aria-label="Falaj"
          onClick={(event) => {
            event.preventDefault();
            onNavigate?.("/");
          }}
        >
          <span className="brand-mark">ف</span>
          <span>
            <strong>فلج</strong>
            <small>{role === "admin" ? "لوحة الإدارة" : companyName || "منصة التشغيل"}</small>
          </span>
        </a>

        <nav className="nav-list" aria-label="التنقل الرئيسي">
          {links.map((link) => (
            <a
              key={link.href}
              className={currentPath === link.href ? "nav-link active" : "nav-link"}
              href={link.href}
              onClick={(event) => {
                event.preventDefault();
                onNavigate?.(link.href);
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {onSignOut ? (
          <button type="button" className="sidebar-signout" onClick={onSignOut}>
            تسجيل الخروج
          </button>
        ) : null}
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
