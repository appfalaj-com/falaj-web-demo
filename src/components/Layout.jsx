import LanguageToggle from "./LanguageToggle.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

const companyLinks = [
  { href: "/company", labelKey: "nav.company.dashboard" },
  { href: "/company/orders", labelKey: "nav.company.orders" },
  { href: "/company/products", labelKey: "nav.company.products" },
  { href: "/company/drivers", labelKey: "nav.company.drivers" },
  { href: "/company/drivers/live", labelKey: "nav.company.liveTracking" },
];

const adminLinks = [
  { href: "/admin", labelKey: "nav.admin.dashboard" },
  { href: "/admin/orders", labelKey: "nav.admin.orders" },
  { href: "/admin/suppliers", labelKey: "nav.admin.suppliers" },
  { href: "/admin/product-moderation", labelKey: "nav.admin.productModeration" },
  { href: "/admin/supplier-requests", labelKey: "nav.admin.supplierRequests" },
  { href: "/admin/finance", labelKey: "nav.admin.finance" },
  { href: "/admin/live-tracking", labelKey: "nav.admin.liveTracking" },
];

const driverLinks = [{ href: "/driver", labelKey: "nav.driver.login" }];

export default function Layout({
  children,
  companyName,
  currentPath = "/company",
  role,
  onNavigate,
  onSignOut,
}) {
  const { t } = useI18n();
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
          <img className="brand-icon" src="/brand/Falaj_Icon.png" alt={t("common.appName")} />
          <span>
            <strong>{t("common.appName")}</strong>
            <small>{role === "admin" ? t("layout.adminPanel") : companyName || t("layout.operationsPlatform")}</small>
          </span>
        </a>

        <nav className="nav-list" aria-label={t("nav.main")}>
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
              {t(link.labelKey)}
            </a>
          ))}
        </nav>

        <LanguageToggle className="sidebar-language-toggle" />

        {onSignOut ? (
          <button type="button" className="sidebar-signout" onClick={onSignOut}>
            {t("common.signOut")}
          </button>
        ) : null}
      </aside>

      <main className="main-content falaj-main">{children}</main>
    </div>
  );
}
