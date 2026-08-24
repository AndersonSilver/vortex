import { useState } from "react";
import { ASSET_STATUS_LABELS, type AssetDTO, type AssetStatus } from "@vortex/shared";
import { useAssets, useCreateAsset, useRetireAsset, useUpdateAsset } from "../../hooks/useAssets";
import { useExpenseCategories } from "../../hooks/useExpenseCategories";
import { usePrinters } from "../../hooks/usePrinters";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

const STATUS_BADGE: Record<AssetStatus, string> = {
  active: "status-delivered",
  maintenance: "status-pending",
  retired: "status-cancelled",
};

interface AssetForm {
  name: string;
  categoryId: string;
  printerId: string;
  status: AssetStatus;
  acquiredAt: string;
  acquisitionCost: string;
  salvageValue: string;
  usefulLifeMonths: string;
  expectedHoursPerMonth: string;
  notes: string;
}

const EMPTY_FORM: AssetForm = {
  name: "",
  categoryId: "",
  printerId: "",
  status: "active",
  acquiredAt: new Date().toISOString().slice(0, 10),
  acquisitionCost: "",
  salvageValue: "0",
  usefulLifeMonths: "60",
  expectedHoursPerMonth: "0",
  notes: "",
};

export function AdminAssetsPage() {
  const { data: assets = [], isLoading } = useAssets(true);
  const { data: categories = [] } = useExpenseCategories();
  const { data: printers = [] } = usePrinters();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const retireAsset = useRetireAsset();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetForm>(EMPTY_FORM);

  const capexCategories = categories.filter((category) => category.kind === "capex");

  const monthlyTotal = assets
    .filter((asset) => asset.status !== "retired")
    .reduce((sum, asset) => sum + asset.monthlyDepreciation, 0);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, categoryId: capexCategories[0]?.id ?? "" });
    setModalOpen(true);
  }

  function openEdit(asset: AssetDTO) {
    setEditingId(asset.id);
    setForm({
      name: asset.name,
      categoryId: asset.categoryId,
      printerId: asset.printerId ?? "",
      status: asset.status,
      acquiredAt: asset.acquiredAt,
      acquisitionCost: String(asset.acquisitionCost),
      salvageValue: String(asset.salvageValue),
      usefulLifeMonths: String(asset.usefulLifeMonths),
      expectedHoursPerMonth: String(asset.expectedHoursPerMonth),
      notes: asset.notes ?? "",
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.categoryId || !form.acquisitionCost) {
      showToast("Informe nome, categoria e valor de aquisição.", "error");
      return;
    }
    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      printerId: form.printerId || null,
      status: form.status,
      acquiredAt: form.acquiredAt,
      acquisitionCost: parseFloat(form.acquisitionCost) || 0,
      salvageValue: parseFloat(form.salvageValue) || 0,
      usefulLifeMonths: parseInt(form.usefulLifeMonths, 10) || 60,
      expectedHoursPerMonth: parseFloat(form.expectedHoursPerMonth) || 0,
      notes: form.notes.trim() || null,
    };
    const action = editingId
      ? updateAsset.mutateAsync({ id: editingId, input: payload })
      : createAsset.mutateAsync(payload);
    action
      .then(() => {
        setModalOpen(false);
        showToast(editingId ? "Ativo atualizado!" : "Ativo cadastrado!", "success");
      })
      .catch(() => showToast("Não foi possível salvar o ativo.", "error"));
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Ativos</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Novo Ativo
        </button>
      </div>

      <p style={{ color: "var(--text-muted)", fontSize: ".85rem", marginBottom: "1rem" }}>
        Impressoras, ferramentas e móveis. A depreciação linear destes ativos alimenta o custo de máquina por hora
        na precificação. Depreciação mensal somada: <strong>R$ {monthlyTotal.toFixed(2)}</strong>
      </p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ativo</th>
              <th>Aquisição</th>
              <th>Valor</th>
              <th>Deprec./mês</th>
              <th>Valor contábil</th>
              <th>Custo/hora</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                  Nenhum ativo. Compras com categoria de investimento criam o ativo no recebimento.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    {asset.name}
                    <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                      {asset.categoryName}
                      {asset.printerName ? ` · ${asset.printerName}` : ""}
                    </div>
                  </td>
                  <td style={{ fontSize: ".82rem" }}>
                    {new Date(`${asset.acquiredAt}T00:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td>R$ {asset.acquisitionCost.toFixed(2)}</td>
                  <td>R$ {asset.monthlyDepreciation.toFixed(2)}</td>
                  <td>R$ {asset.bookValue.toFixed(2)}</td>
                  <td>{asset.costPerHour !== null ? `R$ ${asset.costPerHour.toFixed(2)}` : "—"}</td>
                  <td>
                    <span className={`status-badge ${STATUS_BADGE[asset.status]}`}>
                      {ASSET_STATUS_LABELS[asset.status]}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn" onClick={() => openEdit(asset)}>
                      ✏️
                    </button>
                    {asset.status !== "retired" && (
                      <button
                        className="action-btn danger"
                        onClick={() =>
                          retireAsset.mutate(
                            { id: asset.id },
                            { onSuccess: () => showToast("Ativo baixado. Para de depreciar.", "info") },
                          )
                        }
                      >
                        📉 Baixar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Editar Ativo" : "Novo Ativo"}>
        <div className="form-group">
          <label>Nome</label>
          <input
            className="admin-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Impressora A1, estufa, alicate de bico..."
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
              {capexCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.emoji} {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Impressora vinculada</label>
            <select
              className="admin-select"
              value={form.printerId}
              onChange={(e) => setForm({ ...form, printerId: e.target.value })}
            >
              <option value="">Nenhuma</option>
              {printers.map((printer) => (
                <option key={printer.id} value={printer.id}>
                  {printer.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Data de aquisição</label>
            <input
              className="admin-input"
              type="date"
              value={form.acquiredAt}
              onChange={(e) => setForm({ ...form, acquiredAt: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Valor de aquisição</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={form.acquisitionCost}
              onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Valor residual</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={form.salvageValue}
              onChange={(e) => setForm({ ...form, salvageValue: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Vida útil (meses)</label>
            <input
              className="admin-input"
              type="number"
              value={form.usefulLifeMonths}
              onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Horas/mês previstas</label>
            <input
              className="admin-input"
              type="number"
              step="0.5"
              value={form.expectedHoursPerMonth}
              onChange={(e) => setForm({ ...form, expectedHoursPerMonth: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              className="admin-select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as AssetStatus })}
            >
              {(Object.keys(ASSET_STATUS_LABELS) as AssetStatus[]).map((status) => (
                <option key={status} value={status}>
                  {ASSET_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>
          As horas/mês previstas dividem a depreciação para chegar ao custo de máquina por hora. Ativos sem horas
          entram no rateio do custo fixo.
        </p>
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
    </div>
  );
}
