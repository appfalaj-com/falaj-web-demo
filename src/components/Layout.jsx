const companyLinks = [
  { href: "/company", label: "لوحة الشركة" },
  { href: "/company/orders", label: "طلبات الشركة" },
  { href: "/company/products", label: "المنتجات والأسعار" },
  { href: "/company/drivers", label: "السائقون" },
  { href: "/company/drivers/live", label: "متابعة السائقين" },
];

const adminLinks = [
  { href: "/admin", label: "الإدارة" },
  { href: "/admin/suppliers", label: "الموردون المعتمدون" },
  { href: "/admin/product-moderation", label: "مراجعة الكتالوج" },
  { href: "/admin/supplier-requests", label: "طلبات الانضمام" },
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
  const isActiveLink = (href) => {
    if (href === "/admin") {
      return currentPath === "/admin";
    }

    if (href === "/admin/suppliers") {
      return currentPath === href || currentPath.startsWith("/admin/suppliers/");
    }

    return currentPath === href;
  };

  return (
    <div className="app-shell falaj-shell">
      <aside className="sidebar falaj-sidebar">
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
              className={isActiveLink(link.href) ? "nav-link falaj-nav-link active" : "nav-link falaj-nav-link"}
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

      <main className="main-content falaj-main">{children}</main>
    </div>
  );
}
