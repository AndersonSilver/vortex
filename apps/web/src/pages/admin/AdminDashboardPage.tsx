import { Link } from "react-router-dom";
import { useDashboardStats } from "../../hooks/useAdmin";
import { useAdminOrders } from "../../hooks/useOrders";
import { StatusBadge } from "../../components/StatusBadge";

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: orders = [] } = useAdminOrders("all");

  if (isLoading || !stats) {
    return <p style={{ color: "var(--text-muted)" }}>Carregando dashboard...</p>;
  }

  const maxSale = Math.max(...stats.salesLast7Days.map((d) => d.total), 1);
  const totalOrders = stats.statusBreakdown.reduce((sum, s) => sum + s.count, 0) || 1;

  return (
    <div>
      <div className="admin-header">
        <h1>Dashboard</h1>
        <span style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Atualizado agora</span>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Faturamento Mês</div>
          <div className="kpi-value">R$ {stats.monthRevenue.toFixed(2)}</div>
          <div className="kpi-icon">💰</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pedidos Hoje</div>
          <div className="kpi-value">{stats.ordersToday}</div>
          <div className="kpi-icon">📦</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ticket Médio</div>
          <div className="kpi-value">R$ {stats.averageTicket.toFixed(2)}</div>
          <div className="kpi-icon">📈</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Clientes Ativos</div>
          <div className="kpi-value">{stats.activeCustomers}</div>
          <div className="kpi-icon">👥</div>
        </div>
      </div>
      <div className="charts-grid">
        <div className="chart-wrap">
          <div className="chart-title">Vendas últimos 7 dias</div>
          <div className="chart-bars">
            {stats.salesLast7Days.map((day, i) => (
              <div className="chart-bar-wrap" key={i}>
                <div className="chart-bar" style={{ height: `${(day.total / maxSale) * 100}px` }} title={`R$ ${day.total}`} />
                <div className="chart-bar-label">{day.label}</div>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span style={{ color: "var(--purple)" }}>■</span> Receita
          </div>
        </div>
        <div className="chart-wrap">
          <div className="chart-title">Pedidos por Status</div>
          <div style={{ marginTop: ".5rem" }}>
            {stats.statusBreakdown.map((s) => (
              <div className="status-row" key={s.status}>
                <StatusBadge status={s.status} />
                <div className="status-row-bar">
                  <div className="status-row-fill" style={{ width: `${(s.count / totalOrders) * 100}%` }} />
                </div>
                <span style={{ fontSize: ".82rem", fontWeight: 700 }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <h3>Últimos Pedidos</h3>
          <Link to="/admin/pedidos" className="action-btn">
            Ver todos →
          </Link>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 5).map((order) => (
              <tr key={order.id}>
                <td style={{ fontFamily: "Orbitron, monospace", fontSize: ".8rem", color: "var(--purple)" }}>
                  {order.orderNumber}
                </td>
                <td>{order.customerName}</td>
                <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>
                  {order.items.map((i) => `${i.name} x${i.qty}`).join(", ").slice(0, 35)}
                </td>
                <td>
                  <strong>R$ {order.total.toFixed(2)}</strong>
                </td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
