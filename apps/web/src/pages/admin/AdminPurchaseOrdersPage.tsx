import { useMemo, useState } from "react";
import {
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_PAYMENT_METHODS,
  MEASUREMENT_UNITS,
  PURCHASE_ORDER_STATUS_LABELS,
  type ExpenseCategoryDTO,
  type ExpensePaymentMethod,
  type MeasurementUnit,
  type PurchaseOrderDTO,
  type PurchaseOrderItemInput,
} from "@vortex/shared";
import {
  useCreatePurchaseOrder,
  useDeletePurchaseOrder,
  usePurchaseOrders,
  useUpdatePurchaseOrderStatus,
} from "../../hooks/usePurchaseOrders";
import { useSuppliers } from "../../hooks/useSuppliers";
import { useFilaments } from "../../hooks/useFilaments";
import { useSupplies } from "../../hooks/useSupplies";
import { useExpenseCategories } from "../../hooks/useExpenseCategories";
import { usePrinters } from "../../hooks/usePrinters";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

const STATUS_BADGE: Record<PurchaseOrderDTO["status"], string> = {
  pending: "status-pending",
  received: "status-delivered",
  cancelled: "status-cancelled",
};

interface ItemRow {
  categoryId: string;
  filamentId: string;
  supplyId: string;
  newSupplyName: string;
  description: string;
  quantity: string;
  unit: MeasurementUnit;
  totalCost: string;
  usefulLifeMonths: string;
  salvageValue: string;
  expectedHoursPerMonth: string;
  printerId: string;
}

const EMPTY_ITEM: ItemRow = {
  categoryId: "",
  filamentId: "",
  supplyId: "",
  newSupplyName: "",
  description: "",
  quantity: "",
  unit: "un",
  totalCost: "",
  usefulLifeMonths: "60",
  salvageValue: "0",
  expectedHoursPerMonth: "0",
  printerId: "",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

export function AdminPurchaseOrdersPage() {
  const { data: orders = [], isLoading } = usePurchaseOrders();
  const { data: suppliers = [] } = useSuppliers();
  const { data: filaments = [] } = useFilaments();
  const { data: supplies = [] } = useSupplies();
  const { data: categories = [] } = useExpenseCategories();
  const { data: printers = [] } = usePrinters();
  const createPO = useCreatePurchaseOrder();
  const updateStatus = useUpdatePurchaseOrderStatus();
  const deletePO = useDeletePurchaseOrder();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(today());
  const [freightCost, setFreightCost] = useState("0");
  const [otherCharges, setOtherCharges] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod | "">("");
  const [installments, setInstallments] = useState("1");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);

  const [viewOrder, setViewOrder] = useState<PurchaseOrderDTO | null>(null);

  const categoryById = useMemo(
    () => new Map<string, ExpenseCategoryDTO>(categories.map((category) => [category.id, category])),
    [categories],
  );

  const itemsCost = items.reduce((sum, item) => sum + (parseFloat(item.totalCost) || 0), 0);
  const orderTotal =
    itemsCost + (parseFloat(freightCost) || 0) + (parseFloat(otherCharges) || 0) - (parseFloat(discount) || 0);

  function openCreate() {
    setSupplierId("");
    setDocumentNumber("");
    setPurchasedAt(today());
    setFreightCost("0");
    setOtherCharges("0");
    setDiscount("0");
    setPaymentMethod("");
    setInstallments("1");
    setNotes("");
    setItems([{ ...EMPTY_ITEM }]);
    setModalOpen(true);
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  /** Ao trocar a categoria, limpa os campos que não pertencem ao novo destino. */
  function changeCategory(index: number, categoryId: string) {
    const target = categoryById.get(categoryId)?.target ?? "none";
    updateItem(index, {
      categoryId,
      filamentId: "",
      supplyId: "",
      newSupplyName: "",
      unit: target === "filament" ? "g" : "un",
    });
  }

  function addItemRow() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function buildItems(): PurchaseOrderItemInput[] | null {
    const parsed: PurchaseOrderItemInput[] = [];
    for (const row of items) {
      const category = categoryById.get(row.categoryId);
      const quantity = parseFloat(row.quantity);
      const totalCost = parseFloat(row.totalCost);
      if (!category || !quantity || Number.isNaN(totalCost)) {
        continue;
      }
      if (category.target === "filament" && !row.filamentId) {
        showToast(`Selecione o filamento do item "${category.name}".`, "error");
        return null;
      }
      if (category.target === "supply" && !row.supplyId && !row.newSupplyName.trim()) {
        showToast(`Selecione ou nomeie o insumo do item "${category.name}".`, "error");
        return null;
      }
      parsed.push({
        categoryId: row.categoryId,
        description: row.description.trim() || null,
        filamentId: category.target === "filament" ? row.filamentId : null,
        supplyId: category.target === "supply" && row.supplyId ? row.supplyId : null,
        newSupplyName:
          category.target === "supply" && !row.supplyId ? row.newSupplyName.trim() || null : null,
        asset:
          category.target === "asset"
            ? {
                usefulLifeMonths: parseInt(row.usefulLifeMonths, 10) || 60,
                salvageValue: parseFloat(row.salvageValue) || 0,
                expectedHoursPerMonth: parseFloat(row.expectedHoursPerMonth) || 0,
                printerId: row.printerId || null,
              }
            : null,
        quantity,
        unit: row.unit,
        totalCost,
      });
    }
    if (parsed.length === 0) {
      showToast("Adicione ao menos um item com categoria, quantidade e custo.", "error");
      return null;
    }
    return parsed;
  }

  function handleSave() {
    if (!supplierId) {
      showToast("Selecione um fornecedor.", "error");
      return;
    }
    const parsedItems = buildItems();
    if (!parsedItems) {
      return;
    }
    createPO
      .mutateAsync({
        supplierId,
        documentNumber: documentNumber.trim() || null,
        purchasedAt,
        freightCost: parseFloat(freightCost) || 0,
        otherCharges: parseFloat(otherCharges) || 0,
        discount: parseFloat(discount) || 0,
        paymentMethod: paymentMethod || null,
        installments: parseInt(installments, 10) || 1,
        notes: notes.trim() || null,
        items: parsedItems,
      })
      .then(() => {
        setModalOpen(false);
        showToast("Compra criada!", "success");
      })
      .catch((err: any) =>
        showToast(err?.response?.data?.message ?? "Não foi possível criar a compra.", "error"),
      );
  }

  function handleReceive(po: PurchaseOrderDTO) {
    updateStatus.mutate(
      { id: po.id, input: { status: "received" } },
      {
        onSuccess: () => showToast("Compra recebida! Estoque, ativos e despesas atualizados.", "success"),
        onError: (err: any) =>
          showToast(err?.response?.data?.message ?? "Não foi possível receber a compra.", "error"),
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
      onError: (err: any) =>
        showToast(err?.response?.data?.message ?? "Não foi possível excluir a compra.", "error"),
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
              <th>Documento</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Status</th>
              <th>Data</th>
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
              orders.map((po) => (
                <tr key={po.id}>
                  <td>{po.supplierName}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>{po.documentNumber ?? "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>
                    {po.items.length} {po.items.length === 1 ? "item" : "itens"}
                  </td>
                  <td>
                    <strong>{money(po.totalCost)}</strong>
                  </td>
                  <td>
                    <span className={`status-badge ${STATUS_BADGE[po.status]}`}>
                      {PURCHASE_ORDER_STATUS_LABELS[po.status]}
                    </span>
                  </td>
                  <td style={{ fontSize: ".82rem" }}>
                    {new Date(`${po.purchasedAt}T00:00:00`).toLocaleDateString("pt-BR")}
                  </td>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
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
          <div className="form-group">
            <label>Nota / pedido</label>
            <input
              className="admin-input"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="NF 1234"
            />
          </div>
          <div className="form-group">
            <label>Data da compra</label>
            <input
              className="admin-input"
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Forma de pagamento</label>
            <select
              className="admin-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod | "")}
            >
              <option value="">Não informada</option>
              {EXPENSE_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {EXPENSE_PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>
            Itens — a categoria define o que a compra movimenta ao ser recebida
          </label>
          {items.map((item, i) => {
            const category = categoryById.get(item.categoryId);
            const target = category?.target ?? "none";
            return (
              <div
                key={i}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: ".6rem",
                  marginTop: ".6rem",
                }}
              >
                <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                  <select
                    className="admin-select"
                    style={{ flex: 2 }}
                    value={item.categoryId}
                    onChange={(e) => changeCategory(i, e.target.value)}
                  >
                    <option value="">Categoria do gasto</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>

                  {target === "filament" && (
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
                  )}

                  {target === "supply" && (
                    <>
                      <select
                        className="admin-select"
                        style={{ flex: 2 }}
                        value={item.supplyId}
                        onChange={(e) => updateItem(i, { supplyId: e.target.value })}
                      >
                        <option value="">Novo insumo</option>
                        {supplies.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {!item.supplyId && (
                        <input
                          className="admin-input"
                          style={{ flex: 2 }}
                          placeholder="Nome do insumo"
                          value={item.newSupplyName}
                          onChange={(e) => updateItem(i, { newSupplyName: e.target.value })}
                        />
                      )}
                    </>
                  )}

                  {(target === "none" || target === "asset") && (
                    <input
                      className="admin-input"
                      style={{ flex: 2 }}
                      placeholder={target === "asset" ? "Nome do equipamento" : "Descrição"}
                      value={item.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                    />
                  )}

                  <input
                    className="admin-input"
                    style={{ flex: 1 }}
                    type="number"
                    step="0.001"
                    placeholder="Qtd"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, { quantity: e.target.value })}
                  />
                  <select
                    className="admin-select"
                    style={{ width: "5rem" }}
                    value={item.unit}
                    onChange={(e) => updateItem(i, { unit: e.target.value as MeasurementUnit })}
                  >
                    {MEASUREMENT_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                  <input
                    className="admin-input"
                    style={{ flex: 1 }}
                    type="number"
                    step="0.01"
                    placeholder="Custo total"
                    value={item.totalCost}
                    onChange={(e) => updateItem(i, { totalCost: e.target.value })}
                  />
                  <button className="action-btn danger" onClick={() => removeItemRow(i)} disabled={items.length === 1}>
                    🗑
                  </button>
                </div>

                {target === "asset" && (
                  <div style={{ display: "flex", gap: ".5rem", marginTop: ".5rem" }}>
                    <input
                      className="admin-input"
                      style={{ flex: 1 }}
                      type="number"
                      placeholder="Vida útil (meses)"
                      value={item.usefulLifeMonths}
                      onChange={(e) => updateItem(i, { usefulLifeMonths: e.target.value })}
                    />
                    <input
                      className="admin-input"
                      style={{ flex: 1 }}
                      type="number"
                      step="0.01"
                      placeholder="Valor residual"
                      value={item.salvageValue}
                      onChange={(e) => updateItem(i, { salvageValue: e.target.value })}
                    />
                    <input
                      className="admin-input"
                      style={{ flex: 1 }}
                      type="number"
                      step="0.5"
                      placeholder="Horas/mês previstas"
                      value={item.expectedHoursPerMonth}
                      onChange={(e) => updateItem(i, { expectedHoursPerMonth: e.target.value })}
                    />
                    <select
                      className="admin-select"
                      style={{ flex: 1 }}
                      value={item.printerId}
                      onChange={(e) => updateItem(i, { printerId: e.target.value })}
                    >
                      <option value="">Sem impressora vinculada</option>
                      {printers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
          <button className="action-btn" style={{ marginTop: ".6rem" }} onClick={addItemRow}>
            + Adicionar item
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: ".8rem", marginTop: "1rem" }}>
          <div className="form-group">
            <label>Frete</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={freightCost}
              onChange={(e) => setFreightCost(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Outros encargos</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={otherCharges}
              onChange={(e) => setOtherCharges(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Desconto</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Parcelas</label>
            <input
              className="admin-input"
              type="number"
              min="1"
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
            />
          </div>
        </div>

        <p style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: ".2rem" }}>
          Frete, encargos e desconto são rateados entre os itens pelo valor de cada um, então o custo do estoque
          já sai com o valor real pago.
        </p>

        <div className="form-group" style={{ marginTop: ".6rem" }}>
          <label>Observações</label>
          <textarea className="admin-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: ".8rem" }}>
          <span>Total da compra</span>
          <span>{money(orderTotal)}</span>
        </div>

        <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleSave}>
          💾 Criar Compra
        </button>
      </Modal>

      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Compra · ${viewOrder?.supplierName ?? ""}`}>
        {viewOrder && (
          <>
            <div style={{ marginBottom: ".8rem", display: "flex", gap: ".6rem", alignItems: "center" }}>
              <span className={`status-badge ${STATUS_BADGE[viewOrder.status]}`}>
                {PURCHASE_ORDER_STATUS_LABELS[viewOrder.status]}
              </span>
              <span style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>
                {new Date(`${viewOrder.purchasedAt}T00:00:00`).toLocaleDateString("pt-BR")}
                {viewOrder.documentNumber ? ` · ${viewOrder.documentNumber}` : ""}
                {viewOrder.paymentMethod
                  ? ` · ${EXPENSE_PAYMENT_METHOD_LABELS[viewOrder.paymentMethod]} ${viewOrder.installments}x`
                  : ""}
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
                  {item.categoryName} · {item.label} · {item.quantity}
                  {item.unit}
                </span>
                <span>
                  {money(item.totalCost)}
                  {item.allocatedCost !== null && item.allocatedCost !== item.totalCost && (
                    <span style={{ color: "var(--text-muted)" }}> → {money(item.allocatedCost)}</span>
                  )}
                </span>
              </div>
            ))}
            <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: ".6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Itens</span>
                <span>{money(viewOrder.itemsCost)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Frete + encargos</span>
                <span>{money(viewOrder.freightCost + viewOrder.otherCharges)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Desconto</span>
                <span>-{money(viewOrder.discount)}</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: ".6rem", fontWeight: 700 }}>
              <span>Total</span>
              <span>{money(viewOrder.totalCost)}</span>
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
