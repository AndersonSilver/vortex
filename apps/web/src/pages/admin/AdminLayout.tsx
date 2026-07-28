import { NavLink, Outlet, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin", icon: "📊", label: "Dashboard", end: true },
  { to: "/admin/pedidos", icon: "📦", label: "Pedidos" },
  { to: "/admin/produtos", icon: "🖨️", label: "Produtos" },
  { to: "/admin/cupons", icon: "🎟️", label: "Cupons" },
  { to: "/admin/clientes", icon: "👥", label: "Clientes" },
  { to: "/admin/orcamentos", icon: "🧩", label: "Orçamentos" },
  { to: "/admin/configuracoes", icon: "⚙️", label: "Configurações" },
];

export function AdminLayout() {
  const navigate = useNavigate();
  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="nav-logo" style={{ fontSize: "1rem" }}>
            VÓRTEX 3D
          </div>
          <span>Painel Admin</span>
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
          <a className="push-bottom" onClick={() => navigate("/")}>
            <span>🏠</span> Ver Loja
          </a>
        </nav>
      </div>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
