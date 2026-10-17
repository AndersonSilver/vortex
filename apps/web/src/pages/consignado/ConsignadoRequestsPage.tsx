import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ConsignmentRequestDTO, ConsignmentRequestItemDTO } from "@vortex/shared";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import {
  emptyPickerRow,
  formatDateTime,
  LOW_STOCK,
  pickerToItems,
  ProductQtyPicker,
  RequestStatusBadge,
  type PickerOption,
  type PickerRow,
} from "../../components/consignment";
import {
  useCancelConsignmentRequest,
  useCreateConsignmentRequest,
  useMyConsignmentCatalog,
  useMyConsignmentRequests,
} from "../../hooks/useConsignment";
import { extractErrorMessage } from "../../lib/api-client";

const FLOW = ["Pedido enviado", "Aprovação da Vortex", "Envio para a loja"];

const STEPS = [
  { icon: "📦", title: "Você pede", text: "Escolha os produtos e as quantidades. Dá para pedir produtos novos na loja também." },
  { icon: "✅", title: "A Vortex aprova", text: "Ela pode ajustar as quantidades e define o repasse dos produtos novos." },
  { icon: "🚚", title: "As peças chegam", text: "Quando a Vortex envia, o estoque entra sozinho em Produtos e vendas." },
];

function isOpen(request: ConsignmentRequestDTO) {
  return request.status === "pending" || request.status === "approved";
}

function ItemLine({ item }: { item: ConsignmentRequestItemDTO }) {
  return (
    <>
      {item.qtyRequested}× {item.productName}
      {item.qtySent !== null && item.qtySent !== item.qtyRequested && (
        <span style={{ color: "var(--warning)" }}>{item.qtySent === 0 ? " → cortado" : ` → vão ${item.qtySent}`}</span>
      )}
    </>
  );
}

/** Pedido em andamento: em que passo está, o que foi pedido e as observações. */
function RequestCard({ request, onCancel }: { request: ConsignmentRequestDTO; onCancel: () => void }) {
  const done = request.status === "pending" ? 1 : 2;
  return (
    <div className="request-card">
      <div className="request-card-header">
        <div>
          <div style={{ fontWeight: 600 }}>Pedido de {formatDateTime(request.createdAt)}</div>
          <div style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>
            {request.status === "pending"
              ? "A Vortex ainda vai analisar o pedido."
              : "Aprovado. A Vortex está separando as peças para enviar."}
          </div>
        </div>
        <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
          <RequestStatusBadge status={request.status} />
          {request.status === "pending" && (
            <button className="action-btn danger" onClick={onCancel}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <ol className="request-steps">
        {FLOW.map((label, index) => (
          <li key={label} className={index < done ? "done" : index === done ? "current" : ""}>
            <span className="request-step-dot">{index < done ? "✓" : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <div className="request-items">
        {request.items.map((item) => (
          <span key={item.id} className="request-item">
            {item.productEmoji} <ItemLine item={item} />
          </span>
        ))}
      </div>

      {(request.note || request.adminNote) && (
        <div style={{ marginTop: ".9rem", fontSize: ".82rem", color: "var(--text-muted)" }}>
          {request.note && <div>Sua observação: “{request.note}”</div>}
          {request.adminNote && <div>Resposta da Vortex: “{request.adminNote}”</div>}
        </div>
      )}
    </div>
  );
}

export function ConsignadoRequestsPage() {
  const { data: requests = [], isLoading } = useMyConsignmentRequests();
  const { data: catalog = [], isLoading: catalogLoading } = useMyConsignmentCatalog();
  const createRequest = useCreateConsignmentRequest();
  const cancelRequest = useCancelConsignmentRequest();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PickerRow[]>([emptyPickerRow()]);
  const [note, setNote] = useState("");

  // Vindo do "Pedir reposição" da aba Sem estoque: abre o pedido com o produto já escolhido.
  // Produto que saiu do catálogo abre o pedido vazio. O state é limpo para não reabrir no F5.
  const requestedProductId = (location.state as { productId?: string } | null)?.productId;
  useEffect(() => {
    if (!requestedProductId || catalogLoading) return;
    const inCatalog = catalog.some((c) => c.productId === requestedProductId);
    setRows([inCatalog ? { ...emptyPickerRow(), productId: requestedProductId } : emptyPickerRow()]);
    setOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [requestedProductId, catalogLoading, catalog, navigate, location.pathname]);

  // Produtos que a loja já trabalha aparecem primeiro, com o estoque atual ao lado.
  const options: PickerOption[] = [...catalog]
    .sort((a, b) => Number(b.transferPrice !== null) - Number(a.transferPrice !== null) || a.name.localeCompare(b.name))
    .map((c) => ({
      productId: c.productId,
      name: c.name,
      hint: c.transferPrice !== null ? `${c.quantityOnHand} em loja` : "novo na loja",
    }));

  const inProgress = requests.filter(isOpen);
  const finished = requests.filter((r) => !isOpen(r));
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const shipped = requests.filter((r) => r.status === "shipped");
  const piecesReceived = shipped.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (i.qtySent ?? 0), 0), 0);

  // Zerados ou acabando, que a loja já trabalha e que ainda não estão num pedido aberto.
  const alreadyRequested = new Set(inProgress.flatMap((r) => r.items.map((i) => i.productId)));
  const suggestions = catalog
    .filter((c) => c.transferPrice !== null && c.quantityOnHand <= LOW_STOCK && !alreadyRequested.has(c.productId))
    .sort((a, b) => a.quantityOnHand - b.quantityOnHand || a.name.localeCompare(b.name));

  function openRequest(productIds: string[]) {
    setRows(productIds.map((productId) => ({ ...emptyPickerRow(), productId })));
    setNote("");
    setOpen(true);
  }

  function cancel(requestId: string) {
    cancelRequest.mutate(requestId, {
      onSuccess: () => showToast("Pedido cancelado.", "info"),
      onError: (error) => showToast(extractErrorMessage(error), "error"),
    });
  }

  function handleCreate() {
    const parsed = pickerToItems(rows, options);
    if ("error" in parsed) {
      showToast(parsed.error, "error");
      return;
    }
    createRequest.mutate(
      { items: parsed.items.map(({ productId, qty }) => ({ productId, qty })), note: note || null },
      {
        onSuccess: () => {
          setOpen(false);
          setRows([emptyPickerRow()]);
          setNote("");
          showToast("Pedido enviado para a Vortex!", "success");
        },
        onError: (error) => showToast(extractErrorMessage(error, "Não foi possível enviar o pedido."), "error"),
      },
    );
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Reposição</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + Pedir reposição
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Aguardando aprovação</div>
          <div className="kpi-value" style={{ color: pendingCount > 0 ? "var(--warning)" : undefined }}>
            {pendingCount}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Aprovados, a caminho</div>
          <div className="kpi-value">{approvedCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Peças recebidas</div>
          <div className="kpi-value">{piecesReceived}</div>
          <div className="kpi-change" style={{ color: "var(--text-muted)" }}>
            {shipped.length === 1 ? "em 1 pedido enviado" : `em ${shipped.length} pedidos enviados`}
          </div>
        </div>
      </div>

      <div className="panel-grid">
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <h3>Sugestões de reposição</h3>
            {suggestions.length > 1 && (
              <button className="action-btn" onClick={() => openRequest(suggestions.map((s) => s.productId))}>
                Pedir todos ({suggestions.length})
              </button>
            )}
          </div>
          {catalogLoading ? (
            <p style={{ color: "var(--text-muted)", padding: "1.2rem 1.5rem" }}>Carregando...</p>
          ) : suggestions.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "1.2rem 1.5rem" }}>
              👌 Nenhum produto zerado ou acabando fora de um pedido aberto.
            </p>
          ) : (
            <ul className="suggestion-list">
              {suggestions.map((s) => (
                <li key={s.productId}>
                  <span style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                    <span>{s.emoji}</span>
                    {s.name}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: ".8rem" }}>
                    <span className={`status-badge ${s.quantityOnHand === 0 ? "status-cancelled" : "status-pending"}`}>
                      {s.quantityOnHand === 0 ? "Sem estoque" : `${s.quantityOnHand} un`}
                    </span>
                    <button className="action-btn" onClick={() => openRequest([s.productId])}>
                      Pedir
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Como funciona a reposição</div>
          <ol className="how-steps">
            {STEPS.map((step) => (
              <li key={step.title}>
                <span className="how-step-icon">{step.icon}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <h3 className="panel-title">Em andamento</h3>
      {isLoading ? (
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>Carregando...</p>
      ) : inProgress.length === 0 ? (
        <div className="request-card" style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Nenhum pedido em andamento.
        </div>
      ) : (
        <div className="request-list">
          {inProgress.map((r) => (
            <RequestCard key={r.id} request={r} onCancel={() => cancel(r.id)} />
          ))}
        </div>
      )}

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <h3>Pedidos concluídos</h3>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Itens</th>
              <th>Status</th>
              <th>Resposta da Vortex</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : finished.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  Nenhum pedido concluído ainda.
                </td>
              </tr>
            ) : (
              finished.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontSize: ".82rem" }}>
                    {formatDateTime(r.createdAt)}
                    {r.shippedAt && (
                      <div style={{ color: "var(--text-muted)" }}>enviado {formatDateTime(r.shippedAt)}</div>
                    )}
                  </td>
                  <td>
                    {r.items.map((i) => (
                      <div key={i.id} style={{ fontSize: ".88rem" }}>
                        <ItemLine item={i} />
                      </div>
                    ))}
                    {r.note && <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>“{r.note}”</div>}
                  </td>
                  <td>
                    <RequestStatusBadge status={r.status} />
                  </td>
                  <td style={{ fontSize: ".85rem", color: "var(--text-muted)" }}>{r.adminNote ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="📦 Pedir reposição" size="lg">
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem", fontSize: ".9rem" }}>
          Escolha o que você quer receber. A Vortex aprova, define o repasse dos produtos novos e envia.
        </p>
        <ProductQtyPicker rows={rows} onChange={setRows} options={options} />
        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label>Observação (opcional)</label>
          <input
            className="admin-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: preciso até sexta, cor azul se tiver"
          />
        </div>
        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: "1rem" }}
          onClick={handleCreate}
          disabled={createRequest.isPending}
        >
          {createRequest.isPending ? "Enviando..." : "📨 Enviar pedido"}
        </button>
      </Modal>
    </div>
  );
}
