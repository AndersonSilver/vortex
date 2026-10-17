import { useNavigate } from "react-router-dom";
import { SidebarLayout, type SidebarNavItem } from "../../components/SidebarLayout";

const NAV_ITEMS: SidebarNavItem[] = [
  { to: "/admin", icon: "📊", label: "Dashboard", end: true },
  { to: "/admin/pedidos", icon: "📦", label: "Pedidos" },
  { to: "/admin/produtos", icon: "🖨️", label: "Produtos" },
  { to: "/admin/cupons", icon: "🎟️", label: "Cupons" },
  { to: "/admin/clientes", icon: "👥", label: "Clientes" },
  { to: "/admin/consignados", icon: "🏪", label: "Consignados" },
  { to: "/admin/orcamentos", icon: "🧩", label: "Orçamentos" },
  { to: "/admin/estoque", icon: "🧵", label: "Estoque" },
  { to: "/admin/fornecedores", icon: "🏢", label: "Fornecedores" },
  { to: "/admin/compras", icon: "🛒", label: "Compras" },
  { to: "/admin/insumos", icon: "📦", label: "Insumos" },
  { to: "/admin/ativos", icon: "🏗️", label: "Ativos" },
  { to: "/admin/despesas", icon: "💸", label: "Despesas" },
  { to: "/admin/producao", icon: "🏭", label: "Produção" },
  { to: "/admin/precificacao", icon: "🧮", label: "Precificação" },
  { to: "/admin/financeiro", icon: "💹", label: "Financeiro" },
  { to: "/admin/configuracoes", icon: "⚙️", label: "Configurações" },
];

export function AdminLayout() {
  const navigate = useNavigate();
  return (
    <SidebarLayout
      subtitle="Painel Admin"
      items={NAV_ITEMS}
      footer={{ icon: "🏠", label: "Ver Loja", onClick: () => navigate("/") }}
    />
  );
}
