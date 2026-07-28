import { useNavigate } from "react-router-dom";
import { useMyOrders } from "../hooks/useOrders";
import { useAuthStore } from "../state/auth-store";
import { StatusBadge } from "../components/StatusBadge";

export function AccountPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: orders = [], isLoading } = useMyOrders();

  return (
    <div className="section">
      <div className="container">
        <div className="section-header" style={{ textAlign: "left", marginBottom: "2rem" }}>
          <div className="section-tag">Minha Conta</div>
          <h2 className="section-title">Olá, {user?.name}</h2>
          <p className="section-sub" style={{ margin: 0 }}>
            {user?.email}
          </p>
        </div>
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <h3>Meus Pedidos</h3>
          </div>
          {isLoading ? (
            <p style={{ padding: "1.5rem", color: "var(--text-muted)" }}>Carregando pedidos...</p>
          ) : orders.length === 0 ? (
            <p style={{ padding: "1.5rem", color: "var(--text-muted)" }}>Você ainda não fez nenhum pedido.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Itens</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Rastreio</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: "Orbitron, monospace", color: "var(--purple)" }}>{order.orderNumber}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>
                      {order.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
                    </td>
                    <td>
                      <strong>R$ {order.total.toFixed(2)}</strong>
                    </td>
                    <td style={{ fontSize: ".82rem" }}>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={{ fontSize: ".82rem" }}>
                      {order.trackingCode ? (
                        order.trackingUrl ? (
                          <a href={order.trackingUrl} target="_blank" rel="noreferrer" style={{ color: "var(--purple-light)" }}>
                            {order.trackingCode}
                          </a>
                        ) : (
                          order.trackingCode
                        )
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      {order.paymentStatus !== "approved" && order.status !== "cancelled" && (
                        <button className="action-btn" onClick={() => navigate(`/pedido/${order.id}/pagamento`)}>
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
