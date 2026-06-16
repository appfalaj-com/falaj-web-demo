const links = [
  { href: "/company", label: "لوحة الشركة" },
  { href: "/company/orders", label: "طلبات الشركة" },
  { href: "/company/products", label: "المنتجات والأسعار" },
  { href: "/company/drivers", label: "السائقون" },
  { href: "/driver", label: "واجهة السائق" },
  { href: "/admin", label: "الإدارة" },
];

export default function Layout({ children, currentPath = "/company", onNavigate }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="/company"
          aria-label="Falaj"
          onClick={(event) => {
            event.preventDefault();
            onNavigate?.("/company");
          }}
        >
          <span className="brand-mark">ف</span>
          <span>
            <strong>فلج</strong>
            <small>منصة التشغيل</small>
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
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
