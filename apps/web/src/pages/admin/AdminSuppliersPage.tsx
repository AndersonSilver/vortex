import { useState } from "react";
import type { SupplierDTO } from "@vortex/shared";
import {
  useCreateSupplier,
  useDeactivateSupplier,
  useSuppliers,
  useUpdateSupplier,
} from "../../hooks/useSuppliers";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

interface SupplierFormState {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
}

const EMPTY_FORM: SupplierFormState = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  notes: "",
};

export function AdminSuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deactivateSupplier = useDeactivateSupplier();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierDTO | null>(null);
  const [form, setForm] = useState<SupplierFormState>(EMPTY_FORM);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(supplier: SupplierDTO) {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      contactName: supplier.contactName ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      notes: supplier.notes ?? "",
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name) {
      showToast("Informe o nome do fornecedor.", "error");
      return;
    }
    const input = {
      name: form.name,
      contactName: form.contactName || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
      active: true,
    };
    const mutation = editing
      ? updateSupplier.mutateAsync({ id: editing.id, input })
      : createSupplier.mutateAsync(input);
    mutation
      .then(() => {
        setModalOpen(false);
        showToast(`Fornecedor ${editing ? "atualizado" : "cadastrado"}!`, "success");
      })
      .catch(() => showToast("Não foi possível salvar o fornecedor.", "error"));
  }

  function handleDeactivate(id: string) {
    deactivateSupplier.mutate(id, {
      onSuccess: () => showToast("Fornecedor desativado.", "info"),
      onError: () => showToast("Não foi possível desativar o fornecedor.", "error"),
    });
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Fornecedores</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Novo Fornecedor
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Telefone</th>
              <th>E-mail</th>
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
              suppliers.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td style={{ color: "var(--text-muted)" }}>{s.contactName ?? "—"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{s.phone ?? "—"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{s.email ?? "—"}</td>
                  <td>
                    <button className="action-btn" onClick={() => openEdit(s)}>
                      ✏️ Editar
                    </button>
                    <button className="action-btn danger" onClick={() => handleDeactivate(s.id)}>
                      🗑
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editing ? "Editar" : "Novo"} Fornecedor`}>
        <div className="form-grid" style={{ gap: ".8rem" }}>
          <div className="form-group">
            <label>Nome</label>
            <input className="admin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Contato</label>
            <input
              className="admin-input"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div className="form-group">
            <label>Telefone</label>
            <input
              className="admin-input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div className="form-group">
            <label>E-mail</label>
            <input
              className="admin-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Observações</label>
          <textarea className="admin-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleSave}>
          💾 Salvar Fornecedor
        </button>
      </Modal>
    </div>
  );
}
