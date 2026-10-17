import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarLayout, type SidebarNavItem } from "../../components/SidebarLayout";
import { useMyConsignmentSummary } from "../../hooks/useConsignment";
import { useAuthStore } from "../../state/auth-store";

const NAV_ITEMS: SidebarNavItem[] = [
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
    <SidebarLayout
      subtitle={summary?.store.name ?? "Loja parceira"}
      items={NAV_ITEMS}
      footer={{
        icon: "🚪",
        label: "Sair",
        onClick: () => {
          logout();
          queryClient.clear();
          navigate("/entrar");
        },
      }}
    />
  );
}
