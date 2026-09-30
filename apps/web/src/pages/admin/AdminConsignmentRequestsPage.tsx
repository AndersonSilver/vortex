import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CONSIGNMENT_REQUEST_STATUS_LABELS,
  CONSIGNMENT_REQUEST_STATUSES,
  type ConsignmentRequestDTO,
  type ConsignmentRequestStatus,
} from "@vortex/shared";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { brl, formatDateTime, RequestStatusBadge } from "../../components/consignment";
import {
  useApproveConsignmentRequest,
  useConsignmentRequests,
  useRejectConsignmentRequest,
  useShipConsignmentRequest,
} from "../../hooks/useConsignment";
import { extractErrorMessage } from "../../lib/api-client";

type ApproveRow = { itemId: string; qtySent: string; transferPrice: string };

/** Fila de pedidos de reposição. Sem storeId mostra todas as lojas. */
export function RequestsTable({ storeId }: { storeId?: string }) {
  const [status, setStatus] = useState<ConsignmentRequestStatus | "">(storeId ? "" : "pending");
  const { data: requests = [], isLoading } = useConsignmentRequests({ status, storeId });
  const approve = useApproveConsignmentRequest();
  const reject = useRejectConsignmentRequest();
  const ship = useShipConsignmentRequest();
  const { showToast } = useToast();

  const [approving, setApproving] = useState<{ request: ConsignmentRequestDTO; rows: ApproveRow[]; adminNote: string } | null>(
    null,
  );
  const [rejecting, setRejecting] = useState<{ request: ConsignmentRequestDTO; adminNote: string } | null>(null);

  const onError = (fallback: string) => (error: unknown) => showToast(extractErrorMessage(error, fallback), "error");

  function openApprove(request: ConsignmentRequestDTO) {
    setApproving({
      request,
      adminNote: "",
      rows: request.items.map((item) => ({
        itemId: item.id,
        qtySent: String(item.qtyRequested),
        transferPrice: item.currentTransferPrice !== null ? item.currentTransferPrice.toFixed(2) : "",
      })),
    });
  }

  function handleApprove() {
    if (!approving) return;
    const items = [];
    for (const row of approving.rows) {
      const item = approving.request.items.find((i) => i.id === row.itemId)!;
      const qtySent = parseInt(row.qtySent, 10);
      if (!Number.isInteger(qtySent) || qtySent < 0) {
        showToast(`Quantidade inválida em "${item.productName}".`, "error");
        return;
      }
      const transferPrice = row.transferPrice ? parseFloat(row.transferPrice.replace(",", ".")) : null;
      if (qtySent > 0 && !(transferPrice && transferPrice > 0)) {
        showToast(`Informe o repasse de "${item.productName}".`, "error");
        return;
      }
      items.push({ itemId: row.itemId, qtySent, transferPrice });
    }
    approve.mutate(
      { id: approving.request.id, input: { items, adminNote: approving.adminNote || null } },
      {
        onSuccess: () => {
          setApproving(null);
          showToast("Pedido aprovado. Marque como enviado quando despachar.", "success");
        },
        onError: onError("Não foi possível aprovar o pedido."),
      },
    );
  }

  function handleReject() {
    if (!rejecting) return;
    if (!rejecting.adminNote.trim()) {
      showToast("Explique o motivo para a loja.", "error");
      return;
    }
    reject.mutate(
      { id: rejecting.request.id, adminNote: rejecting.adminNote.trim() },
      {
        onSuccess: () => {
          setRejecting(null);
          showToast("Pedido recusado.", "info");
        },
        onError: onError("Não foi possível recusar o pedido."),
      },
    );
  }

  function handleShip(request: ConsignmentRequestDTO) {
    const pieces = request.items.reduce((sum, i) => sum + (i.qtySent ?? 0), 0);
    if (!window.confirm(`Marcar como enviado? ${pieces} peças entram no estoque de ${request.storeName}.`)) return;
    ship.mutate(request.id, {
      onSuccess: () => showToast("Envio registrado no estoque da loja!", "success"),
      onError: onError("Não foi possível registrar o envio."),
    });
  }

  return (
    <div>
      <div className="tabs" style={{ flexWrap: "wrap" }}>
        <button className={`tab-btn${status === "" ? " active" : ""}`} onClick={() => setStatus("")}>
          Todos
        </button>
        {CONSIGNMENT_REQUEST_STATUSES.map((s) => (
          <button key={s} className={`tab-btn${status === s ? " active" : ""}`} onClick={() => setStatus(s)}>
            {CONSIGNMENT_REQUEST_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Data</th>
              {!storeId && <th>Loja</th>}
              <th>Itens</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={storeId ? 4 : 5} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={storeId ? 4 : 5} style={{ color: "var(--text-muted)" }}>
                  Nenhum pedido.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontSize: ".82rem" }}>
                    {formatDateTime(r.createdAt)}
                    {r.requestedByName && <div style={{ color: "var(--text-muted)" }}>{r.requestedByName}</div>}
                  </td>
                  {!storeId && (
                    <td>
                      <strong>{r.storeName}</strong>
                    </td>
                  )}
                  <td>
                    {r.items.map((i) => (
                      <div key={i.id} style={{ fontSize: ".88rem" }}>
                        {i.qtyRequested}× {i.productName}
                        {i.qtySent !== null && (
                          <span style={{ color: "var(--text-muted)" }}>
                            {" "}
                            → {i.qtySent}
                            {i.transferPrice !== null ? ` a ${brl(i.transferPrice)}` : ""}
                          </span>
                        )}
                        {i.currentTransferPrice === null && r.status === "pending" && (
                          <span className="status-badge status-printing" style={{ marginLeft: ".4rem" }}>
                            novo
                          </span>
                        )}
                      </div>
                    ))}
                    {r.note && <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>“{r.note}”</div>}
                    {r.adminNote && <div style={{ fontSize: ".78rem", color: "var(--cyan)" }}>Vortex: {r.adminNote}</div>}
                  </td>
                  <td>
                    <RequestStatusBadge status={r.status} />
                  </td>
                  <td>
                    {r.status === "pending" && (
                      <>
                        <button className="action-btn" onClick={() => openApprove(r)}>
                          ✅ Aprovar
                        </button>
                        <button className="action-btn danger" onClick={() => setRejecting({ request: r, adminNote: "" })}>
                          Recusar
                        </button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <>
                        <button className="action-btn" onClick={() => handleShip(r)} disabled={ship.isPending}>
                          🚚 Marcar enviado
                        </button>
                        <button className="action-btn danger" onClick={() => setRejecting({ request: r, adminNote: "" })}>
                          Recusar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={approving !== null} onClose={() => setApproving(null)} title="✅ Aprovar reposição" size="lg">
        {approving && (
          <>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem", fontSize: ".9rem" }}>
              Ajuste quanto vai de cada item (0 corta o item) e confirme o repasse. O estoque da loja só sobe quando você
              marcar o pedido como enviado.
            </p>
            <table className="admin-table" style={{ marginBottom: "1rem" }}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Pedido</th>
                  <th>Vai</th>
                  <th>Repasse (R$)</th>
                </tr>
              </thead>
              <tbody>
                {approving.rows.map((row, index) => {
                  const item = approving.request.items.find((i) => i.id === row.itemId)!;
                  const update = (patch: Partial<ApproveRow>) =>
                    setApproving({
                      ...approving,
                      rows: approving.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
                    });
                  return (
                    <tr key={row.itemId}>
                      <td>
                        {item.productName}
                        {item.currentTransferPrice === null && (
                          <span className="status-badge status-printing" style={{ marginLeft: ".4rem" }}>
                            novo na loja
                          </span>
                        )}
                      </td>
                      <td>{item.qtyRequested}</td>
                      <td style={{ width: 100 }}>
                        <input
                          className="admin-input"
                          type="number"
                          min={0}
                          value={row.qtySent}
                          onChange={(e) => update({ qtySent: e.target.value })}
                        />
                      </td>
                      <td style={{ width: 130 }}>
                        <input
                          className="admin-input"
                          type="number"
                          step="0.01"
                          value={row.transferPrice}
                          placeholder="obrigatório"
                          onChange={(e) => update({ transferPrice: e.target.value })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="form-group">
              <label>Recado para a loja (opcional)</label>
              <input
                className="admin-input"
                value={approving.adminNote}
                onChange={(e) => setApproving({ ...approving, adminNote: e.target.value })}
                placeholder="Ex.: envio na quinta pelos Correios"
              />
            </div>
            <button
              className="btn-primary"
              style={{ width: "100%", marginTop: "1rem" }}
              onClick={handleApprove}
              disabled={approve.isPending}
            >
              ✅ Aprovar
            </button>
          </>
        )}
      </Modal>

      <Modal open={rejecting !== null} onClose={() => setRejecting(null)} title="Recusar reposição">
        {rejecting && (
          <>
            <div className="form-group">
              <label>Motivo (a loja vê)</label>
              <textarea
                className="admin-input"
                rows={3}
                value={rejecting.adminNote}
                onChange={(e) => setRejecting({ ...rejecting, adminNote: e.target.value })}
              />
            </div>
            <button
              className="btn-primary"
              style={{ width: "100%", marginTop: "1rem" }}
              onClick={handleReject}
              disabled={reject.isPending}
            >
              Recusar pedido
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}

export function AdminConsignmentRequestsPage() {
  const navigate = useNavigate();
  return (
    <div>
      <div className="admin-header">
        <div>
          <button className="action-btn" onClick={() => navigate("/admin/consignados")} style={{ marginBottom: ".5rem" }}>
            ← Consignados
          </button>
          <h1>Pedidos de reposição</h1>
        </div>
      </div>
      <RequestsTable />
    </div>
  );
}
