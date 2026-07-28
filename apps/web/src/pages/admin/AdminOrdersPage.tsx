import { useEffect, useState } from "react";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderDTO, type OrderStatus } from "@vortex/shared";
import { useAdminOrders, useUpdateOrderStatus, useUpdateOrderTracking } from "../../hooks/useOrders";
import { StatusBadge } from "../../components/StatusBadge";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

export function AdminOrdersPage() {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [viewOrder, setViewOrder] = useState<OrderDTO | null>(null);
  const { data: orders = [], isLoading } = useAdminOrders(filter);
  const updateStatus = useUpdateOrderStatus();
  const updateTracking = useUpdateOrderTracking();
  const { showToast } = useToast();
  const [trackingInput, setTrackingInput] = useState("");

  useEffect(() => {
    setTrackingInput(viewOrder?.trackingCode ?? "");
  }, [viewOrder]);

  const filtered = orders.filter(
    (o) =>
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()),
  );

  function handleStatusChange(orderId: string, status: OrderStatus) {
    updateStatus.mutate(
      { id: orderId, status },
      {
        onSuccess: () => showToast(`Pedido atualizado!`, "info"),
        onError: () => showToast("Não foi possível atualizar o status.", "error"),
      },
    );
  }

  function handleSaveTracking() {
    if (!viewOrder || !trackingInput.trim()) return;
    updateTracking.mutate(
      { id: viewOrder.id, trackingCode: trackingInput.trim() },
      {
        onSuccess: (updated) => {
          setViewOrder(updated);
          showToast("Código de rastreio salvo!", "success");
        },
        onError: () => showToast("Não foi possível salvar o rastreio.", "error"),
      },
    );
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Pedidos</h1>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input placeholder="Buscar pedido..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="tabs">
        <button className={`tab-btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
          Todos
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            className={`tab-btn${filter === status ? " active" : ""}`}
            onClick={() => setFilter(status)}
          >
            {ORDER_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontFamily: "Orbitron, monospace", fontSize: ".8rem", color: "var(--purple)" }}>
                    {order.orderNumber}
                  </td>
                  <td>
                    {order.customerName}
                    <br />
                    <small style={{ color: "var(--text-muted)" }}>{order.customerEmail}</small>
                  </td>
                  <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>
                    {order.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
                  </td>
                  <td>
                    <strong>R$ {order.total.toFixed(2)}</strong>
                  </td>
                  <td style={{ fontSize: ".82rem" }}>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      style={{
                        background: "var(--bg3)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        padding: ".3rem .6rem",
                        borderRadius: "6px",
                        fontSize: ".78rem",
                      }}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {ORDER_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="action-btn" onClick={() => setViewOrder(order)}>
                      👁 Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Pedido ${viewOrder?.orderNumber ?? ""}`}>
        {viewOrder && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Cliente</div>
                <div style={{ fontWeight: 600 }}>{viewOrder.customerName}</div>
              </div>
              <div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>E-mail</div>
                <div>{viewOrder.customerEmail}</div>
              </div>
              <div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Data</div>
                <div>{new Date(viewOrder.createdAt).toLocaleDateString("pt-BR")}</div>
              </div>
              <div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Pagamento</div>
                <div style={{ textTransform: "uppercase" }}>{viewOrder.paymentMethod}</div>
              </div>
              <div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Status</div>
                <StatusBadge status={viewOrder.status} />
              </div>
              <div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Total</div>
                <div style={{ fontFamily: "Orbitron, monospace", color: "var(--purple)", fontWeight: 700 }}>
                  R$ {viewOrder.total.toFixed(2)}
                </div>
              </div>
            </div>
            <div style={{ background: "var(--bg3)", borderRadius: "8px", padding: "1rem", fontSize: ".88rem", color: "var(--text-muted)" }}>
              {viewOrder.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
            </div>

            <div className="section-divider" />
            <div className="form-group">
              <label>🚚 Código de rastreio (Correios / transportadora)</label>
              <input
                className="admin-input"
                placeholder="Ex: AA123456789BR"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
              />
            </div>
            {viewOrder.trackingUrl && (
              <a href={viewOrder.trackingUrl} target="_blank" rel="noreferrer" style={{ fontSize: ".82rem", color: "var(--purple-light)" }}>
                Ver rastreamento →
              </a>
            )}
            <button
              className="btn-outline"
              style={{ width: "100%", marginTop: ".8rem" }}
              onClick={handleSaveTracking}
              disabled={updateTracking.isPending || !trackingInput.trim()}
            >
              💾 Salvar rastreio
            </button>

            <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={() => setViewOrder(null)}>
              Fechar
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
