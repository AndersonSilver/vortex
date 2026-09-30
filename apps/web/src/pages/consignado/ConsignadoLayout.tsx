import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useMyConsignmentSummary } from "../../hooks/useConsignment";
import { useAuthStore } from "../../state/auth-store";

const NAV_ITEMS = [
  { to: "/consignado", icon: "📊", label: "Painel", end: true },
  { to: "/consignado/produtos", icon: "🖨️", label: "Produtos e vendas" },
  { to: "/consignado/reposicao", icon: "📦", label: "Reposição" },
  { to: "/consignado/financeiro", icon: "💰", label: "Financeiro" },
  { to: "/consignado/historico", icon: "🧾", label: "Histórico" },
];

export function ConsignadoLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const { data: summary } = useMyConsignmentSummary();

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="nav-logo" style={{ fontSize: "1rem" }}>
            VÓRTEX 3D
          </div>
          <span>{summary?.store.name ?? "Loja parceira"}</span>
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
          <a
            className="push-bottom"
            onClick={() => {
              logout();
              queryClient.clear();
              navigate("/entrar");
            }}
          >
            <span>🚪</span> Sair
          </a>
        </nav>
      </div>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
