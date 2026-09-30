import { useState } from "react";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import {
  emptyPickerRow,
  formatDateTime,
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

export function ConsignadoRequestsPage() {
  const { data: requests = [], isLoading } = useMyConsignmentRequests();
  const { data: catalog = [] } = useMyConsignmentCatalog();
  const createRequest = useCreateConsignmentRequest();
  const cancelRequest = useCancelConsignmentRequest();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PickerRow[]>([emptyPickerRow()]);
  const [note, setNote] = useState("");

  // Produtos que a loja já trabalha aparecem primeiro, com o estoque atual ao lado.
  const options: PickerOption[] = [...catalog]
    .sort((a, b) => Number(b.transferPrice !== null) - Number(a.transferPrice !== null) || a.name.localeCompare(b.name))
    .map((c) => ({
      productId: c.productId,
      name: c.name,
      hint: c.transferPrice !== null ? `${c.quantityOnHand} em loja` : "novo na loja",
    }));

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

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Itens</th>
              <th>Status</th>
              <th>Resposta da Vortex</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  Você ainda não pediu reposição.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontSize: ".82rem" }}>{formatDateTime(r.createdAt)}</td>
                  <td>
                    {r.items.map((i) => (
                      <div key={i.id} style={{ fontSize: ".88rem" }}>
                        {i.qtyRequested}× {i.productName}
                        {i.qtySent !== null && i.qtySent !== i.qtyRequested && (
                          <span style={{ color: "var(--warning)" }}> → vão {i.qtySent}</span>
                        )}
                      </div>
                    ))}
                    {r.note && <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>“{r.note}”</div>}
                  </td>
                  <td>
                    <RequestStatusBadge status={r.status} />
                  </td>
                  <td style={{ fontSize: ".85rem", color: "var(--text-muted)" }}>{r.adminNote ?? "—"}</td>
                  <td>
                    {r.status === "pending" && (
                      <button
                        className="action-btn danger"
                        onClick={() =>
                          cancelRequest.mutate(r.id, {
                            onSuccess: () => showToast("Pedido cancelado.", "info"),
                            onError: (error) => showToast(extractErrorMessage(error), "error"),
                          })
                        }
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
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
