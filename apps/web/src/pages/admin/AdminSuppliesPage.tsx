import { useState } from "react";
import {
  MEASUREMENT_UNITS,
  SUPPLY_MOVEMENT_TYPE_LABELS,
  SUPPLY_MOVEMENT_TYPES,
  type MeasurementUnit,
  type SupplyDTO,
  type SupplyMovementType,
} from "@vortex/shared";
import {
  useCreateSupply,
  useCreateSupplyMovement,
  useDeleteSupply,
  useSupplies,
  useSupplyMovements,
  useUpdateSupply,
} from "../../hooks/useSupplies";
import { useExpenseCategories } from "../../hooks/useExpenseCategories";
import { useSuppliers } from "../../hooks/useSuppliers";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

interface SupplyForm {
  name: string;
  categoryId: string;
  unit: MeasurementUnit;
  lowStockThreshold: string;
  supplierId: string;
  notes: string;
}

const EMPTY_FORM: SupplyForm = {
  name: "",
  categoryId: "",
  unit: "un",
  lowStockThreshold: "0",
  supplierId: "",
  notes: "",
};

export function AdminSuppliesPage() {
  const { data: supplies = [], isLoading } = useSupplies();
  const { data: categories = [] } = useExpenseCategories();
  const { data: suppliers = [] } = useSuppliers();
  const createSupply = useCreateSupply();
  const updateSupply = useUpdateSupply();
  const deleteSupply = useDeleteSupply();
  const createMovement = useCreateSupplyMovement();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplyForm>(EMPTY_FORM);

  const [movementSupply, setMovementSupply] = useState<SupplyDTO | null>(null);
  const [movementType, setMovementType] = useState<SupplyMovementType>("consumption");
  const [movementQuantity, setMovementQuantity] = useState("");
  const [movementUnitCost, setMovementUnitCost] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const { data: movements = [] } = useSupplyMovements(movementSupply?.id ?? null);

  // Só categorias que movimentam estoque de insumo fazem sentido aqui.
  const supplyCategories = categories.filter((category) => category.target === "supply");

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, categoryId: supplyCategories[0]?.id ?? "" });
    setModalOpen(true);
  }

  function openEdit(supply: SupplyDTO) {
    setEditingId(supply.id);
    setForm({
      name: supply.name,
      categoryId: supply.categoryId,
      unit: supply.unit,
      lowStockThreshold: String(supply.lowStockThreshold),
      supplierId: supply.supplierId ?? "",
      notes: supply.notes ?? "",
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.categoryId) {
      showToast("Informe o nome e a categoria do insumo.", "error");
      return;
    }
    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      unit: form.unit,
      lowStockThreshold: parseFloat(form.lowStockThreshold) || 0,
      supplierId: form.supplierId || null,
      notes: form.notes.trim() || null,
      active: true,
    };
    const action = editingId
      ? updateSupply.mutateAsync({ id: editingId, input: payload })
      : createSupply.mutateAsync({ ...payload, quantityOnHand: 0, avgUnitCost: 0 });
    action
      .then(() => {
        setModalOpen(false);
        showToast(editingId ? "Insumo atualizado!" : "Insumo criado!", "success");
      })
      .catch(() => showToast("Não foi possível salvar o insumo.", "error"));
  }

  function openMovement(supply: SupplyDTO) {
    setMovementSupply(supply);
    setMovementType("consumption");
    setMovementQuantity("");
    setMovementUnitCost("");
    setMovementReason("");
  }

  function handleMovement() {
    if (!movementSupply) {
      return;
    }
    const quantity = parseFloat(movementQuantity);
    if (!quantity) {
      showToast("Informe a quantidade da movimentação.", "error");
      return;
    }
    // Entrada é positiva; consumo e perda saem do estoque.
    const signed = movementType === "purchase" || movementType === "adjustment" ? quantity : -Math.abs(quantity);
    createMovement
      .mutateAsync({
        id: movementSupply.id,
        input: {
          type: movementType,
          changeQuantity: signed,
          unitCost: movementUnitCost ? parseFloat(movementUnitCost) : null,
          reason: movementReason.trim() || null,
        },
      })
      .then(() => {
        setMovementQuantity("");
        setMovementReason("");
        showToast("Movimentação registrada!", "success");
      })
      .catch((err: any) =>
        showToast(err?.response?.data?.message ?? "Não foi possível movimentar o insumo.", "error"),
      );
  }

  const totalStockValue = supplies.reduce((sum, supply) => sum + supply.stockValue, 0);

  return (
    <div>
      <div className="admin-header">
        <h1>Insumos</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Novo Insumo
        </button>
      </div>

      <p style={{ color: "var(--text-muted)", fontSize: ".85rem", marginBottom: "1rem" }}>
        Embalagem, consumível e peça de reposição. O custo médio é recalculado a cada entrada, já com o frete
        rateado da compra. Valor total em estoque: <strong>R$ {totalStockValue.toFixed(2)}</strong>
      </p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Categoria</th>
              <th>Estoque</th>
              <th>Custo médio</th>
              <th>Valor em estoque</th>
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
            ) : supplies.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  Nenhum insumo cadastrado. Eles também são criados automaticamente ao receber uma compra.
                </td>
              </tr>
            ) : (
              supplies.map((supply) => (
                <tr key={supply.id}>
                  <td>
                    {supply.name}
                    {supply.lowStock && (
                      <span className="status-badge status-pending" style={{ marginLeft: ".4rem" }}>
                        estoque baixo
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>{supply.categoryName}</td>
                  <td>
                    {supply.quantityOnHand} {supply.unit}
                  </td>
                  <td>R$ {supply.avgUnitCost.toFixed(4)}</td>
                  <td>
                    <strong>R$ {supply.stockValue.toFixed(2)}</strong>
                  </td>
                  <td>
                    <button className="action-btn" onClick={() => openMovement(supply)}>
                      ↕ Movimentar
                    </button>
                    <button className="action-btn" onClick={() => openEdit(supply)}>
                      ✏️
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={() =>
                        deleteSupply.mutate(supply.id, {
                          onSuccess: () => showToast("Insumo desativado.", "info"),
                        })
                      }
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar Insumo" : "Novo Insumo"}
      >
        <div className="form-group">
          <label>Nome</label>
          <input
            className="admin-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Caixa 20x15, saco zip, cola..."
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
          <div className="form-group">
            <label>Categoria</label>
            <select
              className="admin-select"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Selecione</option>
              {supplyCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.emoji} {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Unidade</label>
            <select
              className="admin-select"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value as MeasurementUnit })}
            >
              {MEASUREMENT_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Estoque mínimo</label>
            <input
              className="admin-input"
              type="number"
              step="0.001"
              value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Fornecedor</label>
            <select
              className="admin-select"
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            >
              <option value="">Nenhum</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Observações</label>
          <textarea
            className="admin-textarea"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <button className="btn-primary" style={{ width: "100%" }} onClick={handleSave}>
          💾 Salvar
        </button>
      </Modal>

      <Modal
        open={!!movementSupply}
        onClose={() => setMovementSupply(null)}
        title={`Movimentar · ${movementSupply?.name ?? ""}`}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
          <div className="form-group">
            <label>Tipo</label>
            <select
              className="admin-select"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as SupplyMovementType)}
            >
              {SUPPLY_MOVEMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SUPPLY_MOVEMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Quantidade ({movementSupply?.unit})</label>
            <input
              className="admin-input"
              type="number"
              step="0.001"
              value={movementQuantity}
              onChange={(e) => setMovementQuantity(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Custo unitário (opcional)</label>
            <input
              className="admin-input"
              type="number"
              step="0.0001"
              value={movementUnitCost}
              onChange={(e) => setMovementUnitCost(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Motivo</label>
            <input
              className="admin-input"
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
            />
          </div>
        </div>
        <button className="btn-primary" style={{ width: "100%" }} onClick={handleMovement}>
          ↕ Registrar movimentação
        </button>

        <h4 style={{ marginTop: "1.2rem", fontSize: ".9rem" }}>Últimas movimentações</h4>
        {movements.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>Nenhuma movimentação registrada.</p>
        ) : (
          movements.map((movement) => (
            <div
              key={movement.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: ".82rem",
                padding: ".35rem 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>
                {SUPPLY_MOVEMENT_TYPE_LABELS[movement.type]}
                {movement.reason ? ` · ${movement.reason}` : ""}
              </span>
              <span>
                {movement.changeQuantity > 0 ? "+" : ""}
                {movement.changeQuantity}
              </span>
            </div>
          ))
        )}
      </Modal>
    </div>
  );
}
