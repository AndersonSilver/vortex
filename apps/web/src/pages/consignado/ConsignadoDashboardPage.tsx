import { useNavigate } from "react-router-dom";
import { extractErrorMessage } from "../../lib/api-client";
import { useMyConsignmentRequests, useMyConsignmentSummary } from "../../hooks/useConsignment";
import { brl, formatDateTime, RequestStatusBadge } from "../../components/consignment";

export function ConsignadoDashboardPage() {
  const navigate = useNavigate();
  const { data: summary, isLoading, error } = useMyConsignmentSummary();
  const { data: requests = [] } = useMyConsignmentRequests();
  const open = requests.filter((r) => r.status === "pending" || r.status === "approved");

  if (isLoading) return <p style={{ color: "var(--text-muted)" }}>Carregando...</p>;
  if (error || !summary) {
    return (
      <div className="admin-header">
        <h1>{extractErrorMessage(error, "Não foi possível carregar o painel da loja.")}</h1>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Olá, {summary.store.name}</h1>
        <button className="btn-primary" onClick={() => navigate("/consignado/produtos")}>
          🧾 Registrar venda
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Peças na loja</div>
          <div className="kpi-value">{summary.piecesOnHand}</div>
          <div className="kpi-change" style={{ color: "var(--text-muted)" }}>
            {summary.productsCount} produtos diferentes
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Estoque a preço de repasse</div>
          <div className="kpi-value">{brl(summary.stockValue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Vendas no mês</div>
          <div className="kpi-value">{summary.monthPiecesSold} peças</div>
          <div className="kpi-change" style={{ color: "var(--text-muted)" }}>
            {brl(summary.monthSalesAmount)} a repassar
          </div>
        </div>
        <div className="kpi-card" style={{ cursor: "pointer" }} onClick={() => navigate("/consignado/financeiro")}>
          <div className="kpi-label">Saldo a repassar</div>
          <div className="kpi-value" style={{ color: summary.balanceDue > 0 ? "var(--warning)" : "var(--success)" }}>
            {brl(summary.balanceDue)}
          </div>
        </div>
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <h3>Pedidos de reposição em aberto</h3>
          <button className="action-btn" onClick={() => navigate("/consignado/reposicao")}>
            + Pedir reposição
          </button>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Itens</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {open.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                  Nenhum pedido em aberto.
                </td>
              </tr>
            ) : (
              open.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.createdAt)}</td>
                  <td>{r.items.map((i) => `${i.qtyRequested}× ${i.productName}`).join(", ")}</td>
                  <td>
                    <RequestStatusBadge status={r.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
