import { useState } from "react";
import { PURCHASE_ORDER_STATUS_LABELS, type PurchaseOrderDTO } from "@vortex/shared";
import {
  useCreatePurchaseOrder,
  useDeletePurchaseOrder,
  usePurchaseOrders,
  useUpdatePurchaseOrderStatus,
} from "../../hooks/usePurchaseOrders";
import { useSuppliers } from "../../hooks/useSuppliers";
import { useFilaments } from "../../hooks/useFilaments";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

const STATUS_BADGE: Record<PurchaseOrderDTO["status"], string> = {
  pending: "status-pending",
  received: "status-delivered",
  cancelled: "status-cancelled",
};

interface ItemRow {
  filamentId: string;
  quantityGrams: string;
  totalCost: string;
}

const EMPTY_ITEM: ItemRow = { filamentId: "", quantityGrams: "", totalCost: "" };

export function AdminPurchaseOrdersPage() {
  const { data: orders = [], isLoading } = usePurchaseOrders();
  const { data: suppliers = [] } = useSuppliers();
  const { data: filaments = [] } = useFilaments();
  const createPO = useCreatePurchaseOrder();
  const updateStatus = useUpdatePurchaseOrderStatus();
  const deletePO = useDeletePurchaseOrder();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);

  const [viewOrder, setViewOrder] = useState<PurchaseOrderDTO | null>(null);

  function openCreate() {
    setSupplierId("");
    setNotes("");
    setItems([{ ...EMPTY_ITEM }]);
    setModalOpen(true);
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItemRow() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (!supplierId) {
      showToast("Selecione um fornecedor.", "error");
      return;
    }
    const parsedItems = items
      .filter((it) => it.filamentId && it.quantityGrams && it.totalCost)
      .map((it) => ({
        filamentId: it.filamentId,
        quantityGrams: parseInt(it.quantityGrams, 10),
        totalCost: parseFloat(it.totalCost),
      }));
    if (parsedItems.length === 0) {
      showToast("Adicione ao menos um item válido.", "error");
      return;
    }
    createPO
      .mutateAsync({ supplierId, notes: notes || null, items: parsedItems })
      .then(() => {
        setModalOpen(false);
        showToast("Compra criada!", "success");
      })
      .catch(() => showToast("Não foi possível criar a compra.", "error"));
  }

  function handleReceive(po: PurchaseOrderDTO) {
    updateStatus.mutate(
      { id: po.id, input: { status: "received" } },
      {
        onSuccess: () => showToast("Compra recebida! Estoque atualizado.", "success"),
        onError: (err: any) => showToast(err?.response?.data?.message ?? "Não foi possível receber a compra.", "error"),
      },
    );
  }

  function handleCancel(po: PurchaseOrderDTO) {
    updateStatus.mutate(
      { id: po.id, input: { status: "cancelled" } },
      {
        onSuccess: () => showToast("Compra cancelada.", "info"),
        onError: () => showToast("Não foi possível cancelar a compra.", "error"),
      },
    );
  }

  function handleDelete(id: string) {
    deletePO.mutate(id, {
      onSuccess: () => showToast("Compra removida.", "info"),
      onError: () => showToast("Só é possível excluir compras pendentes.", "error"),
    });
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Compras</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Nova Compra
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Fornecedor</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Status</th>
              <th>Criada em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : (
              orders.map((po) => (
                <tr key={po.id}>
                  <td>{po.supplierName}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>
                    {po.items.length} {po.items.length === 1 ? "item" : "itens"}
                  </td>
                  <td>
                    <strong>R$ {po.totalCost.toFixed(2)}</strong>
                  </td>
                  <td>
                    <span className={`status-badge ${STATUS_BADGE[po.status]}`}>
                      {PURCHASE_ORDER_STATUS_LABELS[po.status]}
                    </span>
                  </td>
                  <td style={{ fontSize: ".82rem" }}>{new Date(po.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <button className="action-btn" onClick={() => setViewOrder(po)}>
                      👁 Ver
                    </button>
                    {po.status === "pending" && (
                      <>
                        <button className="action-btn" onClick={() => handleReceive(po)}>
                          📥 Receber
                        </button>
                        <button className="action-btn" onClick={() => handleCancel(po)}>
                          ✖ Cancelar
                        </button>
                        <button className="action-btn danger" onClick={() => handleDelete(po.id)}>
                          🗑
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Compra">
        <div className="form-group">
          <label>Fornecedor</label>
          <select className="admin-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Selecione um fornecedor</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>Itens</label>
          {items.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: ".5rem", marginTop: ".5rem", alignItems: "center" }}>
              <select
                className="admin-select"
                style={{ flex: 2 }}
                value={item.filamentId}
                onChange={(e) => updateItem(i, { filamentId: e.target.value })}
              >
                <option value="">Filamento</option>
                {filaments.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.brand} · {f.color}
                  </option>
                ))}
              </select>
              <input
                className="admin-input"
                style={{ flex: 1 }}
                type="number"
                placeholder="Peso (g)"
                value={item.quantityGrams}
                onChange={(e) => updateItem(i, { quantityGrams: e.target.value })}
              />
              <input
                className="admin-input"
                style={{ flex: 1 }}
                type="number"
                step="0.01"
                placeholder="Custo total (R$)"
                value={item.totalCost}
                onChange={(e) => updateItem(i, { totalCost: e.target.value })}
              />
              <button className="action-btn danger" onClick={() => removeItemRow(i)} disabled={items.length === 1}>
                🗑
              </button>
            </div>
          ))}
          <button className="action-btn" style={{ marginTop: ".6rem" }} onClick={addItemRow}>
            + Adicionar item
          </button>
        </div>

        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label>Observações</label>
          <textarea className="admin-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleSave}>
          💾 Criar Compra
        </button>
      </Modal>

      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Compra · ${viewOrder?.supplierName ?? ""}`}>
        {viewOrder && (
          <>
            <div style={{ marginBottom: "1rem" }}>
              <span className={`status-badge ${STATUS_BADGE[viewOrder.status]}`}>
                {PURCHASE_ORDER_STATUS_LABELS[viewOrder.status]}
              </span>
            </div>
            {viewOrder.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: ".85rem",
                  padding: ".4rem 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span>
                  {item.filamentLabel} · {item.quantityGrams}g
                </span>
                <span>R$ {item.totalCost.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: ".8rem", fontWeight: 700 }}>
              <span>Total</span>
              <span>R$ {viewOrder.totalCost.toFixed(2)}</span>
            </div>
            {viewOrder.notes && (
              <p style={{ color: "var(--text-muted)", fontSize: ".82rem", marginTop: ".8rem" }}>{viewOrder.notes}</p>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
