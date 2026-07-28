import { useState } from "react";
import {
  FILAMENT_MATERIALS,
  FILAMENT_MATERIAL_LABELS,
  type FilamentDTO,
  type FilamentMaterialType,
  type FilamentMovementType,
} from "@vortex/shared";
import {
  useCreateFilament,
  useCreateFilamentMovement,
  useDeactivateFilament,
  useFilamentMovements,
  useFilaments,
  useUpdateFilament,
} from "../../hooks/useFilaments";
import { useSuppliers } from "../../hooks/useSuppliers";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

interface FilamentFormState {
  brand: string;
  material: FilamentMaterialType;
  color: string;
  colorHex: string;
  spoolWeightGrams: string;
  remainingWeightGrams: string;
  costPerSpool: string;
  lowStockThresholdGrams: string;
  supplierId: string;
  notes: string;
}

const EMPTY_FORM: FilamentFormState = {
  brand: "",
  material: "PLA",
  color: "",
  colorHex: "#8a8aff",
  spoolWeightGrams: "1000",
  remainingWeightGrams: "1000",
  costPerSpool: "120",
  lowStockThresholdGrams: "150",
  supplierId: "",
  notes: "",
};

const MOVEMENT_LABELS: Record<FilamentMovementType, string> = {
  purchase: "Compra (+)",
  consumption: "Consumo (-)",
  adjustment: "Ajuste",
  waste: "Perda (-)",
};

function costPerGram(filament: FilamentDTO): number {
  return filament.costPerSpool / filament.spoolWeightGrams;
}

export function AdminFilamentsPage() {
  const { data: filaments = [], isLoading } = useFilaments();
  const { data: suppliers = [] } = useSuppliers();
  const createFilament = useCreateFilament();
  const updateFilament = useUpdateFilament();
  const deactivateFilament = useDeactivateFilament();
  const createMovement = useCreateFilamentMovement();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FilamentDTO | null>(null);
  const [form, setForm] = useState<FilamentFormState>(EMPTY_FORM);

  const [movementFilament, setMovementFilament] = useState<FilamentDTO | null>(null);
  const [movementType, setMovementType] = useState<FilamentMovementType>("purchase");
  const [movementGrams, setMovementGrams] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const { data: movements = [] } = useFilamentMovements(movementFilament?.id);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(filament: FilamentDTO) {
    setEditing(filament);
    setForm({
      brand: filament.brand,
      material: filament.material,
      color: filament.color,
      colorHex: filament.colorHex ?? "#8a8aff",
      spoolWeightGrams: String(filament.spoolWeightGrams),
      remainingWeightGrams: String(filament.remainingWeightGrams),
      costPerSpool: String(filament.costPerSpool),
      lowStockThresholdGrams: String(filament.lowStockThresholdGrams),
      supplierId: filament.supplierId ?? "",
      notes: filament.notes ?? "",
    });
    setModalOpen(true);
  }

  function handleSave() {
    const spoolWeightGrams = parseInt(form.spoolWeightGrams, 10);
    const costPerSpool = parseFloat(form.costPerSpool);
    if (!form.brand || !form.color || !spoolWeightGrams || !costPerSpool) {
      showToast("Preencha marca, cor, peso do rolo e custo.", "error");
      return;
    }
    const base = {
      brand: form.brand,
      material: form.material,
      color: form.color,
      colorHex: form.colorHex || null,
      spoolWeightGrams,
      costPerSpool,
      lowStockThresholdGrams: parseInt(form.lowStockThresholdGrams, 10) || 0,
      supplierId: form.supplierId || null,
      notes: form.notes || null,
      active: true,
    };
    const mutation = editing
      ? updateFilament.mutateAsync({ id: editing.id, input: base })
      : createFilament.mutateAsync({ ...base, remainingWeightGrams: parseInt(form.remainingWeightGrams, 10) || 0 });
    mutation
      .then(() => {
        setModalOpen(false);
        showToast(`Filamento ${editing ? "atualizado" : "cadastrado"}!`, "success");
      })
      .catch(() => showToast("Não foi possível salvar o filamento.", "error"));
  }

  function handleDeactivate(id: string) {
    deactivateFilament.mutate(id, {
      onSuccess: () => showToast("Filamento desativado.", "info"),
      onError: () => showToast("Não foi possível desativar o filamento.", "error"),
    });
  }

  function openMovement(filament: FilamentDTO) {
    setMovementFilament(filament);
    setMovementType("purchase");
    setMovementGrams("");
    setMovementReason("");
  }

  function handleSaveMovement() {
    const grams = parseInt(movementGrams, 10);
    if (!movementFilament || !grams) {
      showToast("Informe a quantidade em gramas.", "error");
      return;
    }
    const signedGrams = movementType === "consumption" || movementType === "waste" ? -Math.abs(grams) : grams;
    createMovement
      .mutateAsync({
        filamentId: movementFilament.id,
        input: { type: movementType, changeGrams: signedGrams, reason: movementReason || undefined },
      })
      .then(() => {
        showToast("Movimentação registrada!", "success");
        setMovementGrams("");
        setMovementReason("");
      })
      .catch((err) => showToast(err?.response?.data?.message ?? "Não foi possível registrar a movimentação.", "error"));
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Estoque de Filamento</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Novo Filamento
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Filamento</th>
              <th>Estoque</th>
              <th>Custo/kg</th>
              <th>Fornecedor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : (
              filaments.map((f) => {
                const isLow = f.remainingWeightGrams <= f.lowStockThresholdGrams;
                const pct = Math.min(100, Math.round((f.remainingWeightGrams / f.spoolWeightGrams) * 100));
                return (
                  <tr key={f.id}>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: f.colorHex ?? "#8a8aff",
                          marginRight: ".5rem",
                          verticalAlign: "middle",
                          border: "1px solid var(--border)",
                        }}
                      />
                      {f.brand} · {FILAMENT_MATERIAL_LABELS[f.material]} · {f.color}
                    </td>
                    <td>
                      <div style={{ fontSize: ".82rem" }}>
                        {f.remainingWeightGrams}g / {f.spoolWeightGrams}g{" "}
                        {isLow && (
                          <span className="status-badge status-cancelled" style={{ marginLeft: ".4rem" }}>
                            Estoque baixo
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          marginTop: ".3rem",
                          height: "6px",
                          borderRadius: "4px",
                          background: "var(--bg2)",
                          overflow: "hidden",
                          width: "140px",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: isLow ? "var(--danger)" : "var(--success)",
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>
                      R$ {(costPerGram(f) * 1000).toFixed(2)}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>{f.supplierName ?? "—"}</td>
                    <td>
                      <button className="action-btn" onClick={() => openMovement(f)}>
                        📦 Movimentar
                      </button>
                      <button className="action-btn" onClick={() => openEdit(f)}>
                        ✏️ Editar
                      </button>
                      <button className="action-btn danger" onClick={() => handleDeactivate(f.id)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editing ? "Editar" : "Novo"} Filamento`}>
        <div className="form-grid" style={{ gap: ".8rem" }}>
          <div className="form-group">
            <label>Marca</label>
            <input className="admin-input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Material</label>
            <select
              className="admin-select"
              value={form.material}
              onChange={(e) => setForm({ ...form, material: e.target.value as FilamentMaterialType })}
            >
              {FILAMENT_MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {FILAMENT_MATERIAL_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Cor</label>
            <input className="admin-input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Cor (amostra)</label>
            <input
              type="color"
              className="admin-input"
              value={form.colorHex}
              onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
              style={{ height: "40px", padding: "2px" }}
            />
          </div>
          <div className="form-group">
            <label>Peso do rolo cheio (g)</label>
            <input
              className="admin-input"
              type="number"
              value={form.spoolWeightGrams}
              onChange={(e) => setForm({ ...form, spoolWeightGrams: e.target.value })}
            />
          </div>
          {!editing && (
            <div className="form-group">
              <label>Estoque inicial (g)</label>
              <input
                className="admin-input"
                type="number"
                value={form.remainingWeightGrams}
                onChange={(e) => setForm({ ...form, remainingWeightGrams: e.target.value })}
              />
            </div>
          )}
          <div className="form-group">
            <label>Custo do rolo (R$)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={form.costPerSpool}
              onChange={(e) => setForm({ ...form, costPerSpool: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Alerta de estoque baixo (g)</label>
            <input
              className="admin-input"
              type="number"
              value={form.lowStockThresholdGrams}
              onChange={(e) => setForm({ ...form, lowStockThresholdGrams: e.target.value })}
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
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Observações</label>
          <textarea className="admin-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleSave}>
          💾 Salvar Filamento
        </button>
      </Modal>

      <Modal
        open={!!movementFilament}
        onClose={() => setMovementFilament(null)}
        title={`Movimentar estoque · ${movementFilament?.brand ?? ""}`}
      >
        <div className="form-grid" style={{ gap: ".8rem" }}>
          <div className="form-group">
            <label>Tipo</label>
            <select
              className="admin-select"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as FilamentMovementType)}
            >
              {(Object.keys(MOVEMENT_LABELS) as FilamentMovementType[]).map((t) => (
                <option key={t} value={t}>
                  {MOVEMENT_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Quantidade (g)</label>
            <input
              className="admin-input"
              type="number"
              min="1"
              value={movementGrams}
              onChange={(e) => setMovementGrams(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Motivo (opcional)</label>
          <input
            className="admin-input"
            value={movementReason}
            onChange={(e) => setMovementReason(e.target.value)}
            placeholder="Ex: Pedido #123"
          />
        </div>
        <button className="btn-primary" style={{ width: "100%", marginTop: ".6rem" }} onClick={handleSaveMovement}>
          Registrar
        </button>

        {movements.length > 0 && (
          <div style={{ marginTop: "1.2rem" }}>
            <h3 style={{ fontSize: ".9rem", marginBottom: ".5rem" }}>Histórico</h3>
            <div style={{ maxHeight: "220px", overflowY: "auto" }}>
              {movements.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: ".82rem",
                    padding: ".4rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span>{MOVEMENT_LABELS[m.type]}{m.reason ? ` · ${m.reason}` : ""}</span>
                  <span style={{ color: m.changeGrams < 0 ? "var(--danger)" : "var(--success)" }}>
                    {m.changeGrams > 0 ? "+" : ""}
                    {m.changeGrams}g
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
