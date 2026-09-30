import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ConsignmentStoreDTO, ConsignmentStoreInput } from "@vortex/shared";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { brl } from "../../components/consignment";
import { useConsignmentStores, useSaveConsignmentStore } from "../../hooks/useConsignment";
import { extractErrorMessage } from "../../lib/api-client";

type StoreForm = Record<"name" | "document" | "contactName" | "phone" | "email" | "address" | "notes", string> & {
  active: boolean;
};

const EMPTY_FORM: StoreForm = {
  name: "",
  document: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  active: true,
};

export function storeToForm(store: ConsignmentStoreDTO): StoreForm {
  return {
    name: store.name,
    document: store.document ?? "",
    contactName: store.contactName ?? "",
    phone: store.phone ?? "",
    email: store.email ?? "",
    address: store.address ?? "",
    notes: store.notes ?? "",
    active: store.active,
  };
}

export function formToInput(form: StoreForm): ConsignmentStoreInput {
  const orNull = (value: string) => value.trim() || null;
  return {
    name: form.name.trim(),
    document: orNull(form.document),
    contactName: orNull(form.contactName),
    phone: orNull(form.phone),
    email: orNull(form.email),
    address: orNull(form.address),
    notes: orNull(form.notes),
    active: form.active,
  };
}

/** Formulário de loja, usado para criar aqui e para editar na página da loja. */
export function StoreFormModal({
  open,
  onClose,
  store,
}: {
  open: boolean;
  onClose: () => void;
  store?: ConsignmentStoreDTO;
}) {
  const save = useSaveConsignmentStore();
  const { showToast } = useToast();
  const [form, setForm] = useState<StoreForm>(store ? storeToForm(store) : EMPTY_FORM);
  const set = (key: keyof StoreForm) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  function handleSave() {
    if (form.name.trim().length < 2) {
      showToast("Informe o nome da loja.", "error");
      return;
    }
    save.mutate(
      { id: store?.id, input: formToInput(form) },
      {
        onSuccess: () => {
          showToast(store ? "Loja atualizada!" : "Loja cadastrada!", "success");
          if (!store) setForm(EMPTY_FORM);
          onClose();
        },
        onError: (error) => showToast(extractErrorMessage(error, "Não foi possível salvar a loja."), "error"),
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={store ? "✏️ Editar loja" : "🏪 Nova loja consignada"} size="lg">
      <div className="form-grid">
        <div className="form-group">
          <label>Nome da loja</label>
          <input className="admin-input" value={form.name} onChange={set("name")} />
        </div>
        <div className="form-group">
          <label>CNPJ / CPF</label>
          <input className="admin-input" value={form.document} onChange={set("document")} />
        </div>
        <div className="form-group">
          <label>Responsável</label>
          <input className="admin-input" value={form.contactName} onChange={set("contactName")} />
        </div>
        <div className="form-group">
          <label>Telefone</label>
          <input className="admin-input" value={form.phone} onChange={set("phone")} />
        </div>
        <div className="form-group">
          <label>E-mail</label>
          <input className="admin-input" type="email" value={form.email} onChange={set("email")} />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select
            className="admin-select"
            value={form.active ? "1" : "0"}
            onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}
          >
            <option value="1">Ativa</option>
            <option value="0">Desativada (bloqueia o painel da loja)</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Endereço</label>
        <input className="admin-input" value={form.address} onChange={set("address")} />
      </div>
      <div className="form-group">
        <label>Observações internas</label>
        <textarea className="admin-input" rows={3} value={form.notes} onChange={set("notes")} />
      </div>
      <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleSave} disabled={save.isPending}>
        💾 Salvar
      </button>
    </Modal>
  );
}

export function AdminConsignmentStoresPage() {
  const navigate = useNavigate();
  const { data: stores = [], isLoading } = useConsignmentStores();
  const [creating, setCreating] = useState(false);

  const totals = stores.reduce(
    (acc, s) => ({
      pieces: acc.pieces + s.piecesOnHand,
      value: acc.value + s.stockValue,
      due: acc.due + s.balanceDue,
      pending: acc.pending + s.pendingRequests,
    }),
    { pieces: 0, value: 0, due: 0, pending: 0 },
  );

  return (
    <div>
      <div className="admin-header">
        <h1>Consignados</h1>
        <div style={{ display: "flex", gap: ".6rem" }}>
          <button className="btn-ghost" onClick={() => navigate("/admin/consignados/reposicoes")}>
            📦 Reposições{totals.pending > 0 ? ` (${totals.pending})` : ""}
          </button>
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Nova loja
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Peças em consignação</div>
          <div className="kpi-value">{totals.pieces}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Valor em lojas (repasse)</div>
          <div className="kpi-value">{brl(totals.value)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">A receber das lojas</div>
          <div className="kpi-value" style={{ color: totals.due > 0 ? "var(--warning)" : undefined }}>
            {brl(totals.due)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Reposições pendentes</div>
          <div className="kpi-value">{totals.pending}</div>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Loja</th>
              <th>Responsável</th>
              <th>Peças</th>
              <th>Valor em loja</th>
              <th>A receber</th>
              <th>Reposições</th>
              <th>Usuários</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : stores.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                  Nenhuma loja consignada ainda. Cadastre a primeira em “+ Nova loja”.
                </td>
              </tr>
            ) : (
              stores.map((s) => (
                <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/admin/consignados/${s.id}`)}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{s.contactName ?? "—"}</td>
                  <td>{s.piecesOnHand}</td>
                  <td>{brl(s.stockValue)}</td>
                  <td style={{ color: s.balanceDue > 0 ? "var(--warning)" : undefined, fontWeight: 600 }}>
                    {brl(s.balanceDue)}
                  </td>
                  <td>
                    {s.pendingRequests > 0 ? (
                      <span className="status-badge status-pending">{s.pendingRequests} em aberto</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{s.usersCount}</td>
                  <td>
                    <span className={`status-badge ${s.active ? "status-active" : "status-inactive"}`}>
                      {s.active ? "Ativa" : "Desativada"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && <StoreFormModal open onClose={() => setCreating(false)} />}
    </div>
  );
}
