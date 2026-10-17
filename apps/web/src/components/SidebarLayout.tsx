import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { watchTables } from "../lib/responsive-tables";

export interface SidebarNavItem {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
}

/**
 * Layout com menu lateral, usado pelo painel admin e pelo do consignado. No celular o menu vira uma
 * gaveta que abre pelo botão ☰ no topo da página.
 */
export function SidebarLayout({
  subtitle,
  items,
  footer,
}: {
  subtitle: ReactNode;
  items: SidebarNavItem[];
  footer: { icon: string; label: string; onClick: () => void };
}) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // No celular as tabelas viram cards; os rótulos das células saem do cabeçalho de cada tabela.
  useEffect(() => (mainRef.current ? watchTables(mainRef.current) : undefined), []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // A entrada mais específica que bate com a URL (ex.: /admin/consignados/:id → Consignados).
  const current = items
    .filter((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <div className="admin-layout">
      <div id="admin-sidebar" className={`admin-sidebar${menuOpen ? " open" : ""}`}>
        <div className="admin-sidebar-logo">
          <div className="nav-logo" style={{ fontSize: "1rem" }}>
            VÓRTEX 3D
          </div>
          <span>{subtitle}</span>
        </div>
        <nav className="admin-nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
          <a className="push-bottom" onClick={footer.onClick}>
            <span>{footer.icon}</span> {footer.label}
          </a>
        </nav>
      </div>
      {menuOpen && <div className="admin-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
      <div className="admin-main" ref={mainRef}>
        <button
          className="admin-menu-toggle"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
        >
          <span className="admin-menu-toggle-icon">☰</span>
          <span>{current ? `${current.icon} ${current.label}` : "Menu"}</span>
          <span className="admin-menu-toggle-hint">Menu</span>
        </button>
        <Outlet />
      </div>
    </div>
  );
}
