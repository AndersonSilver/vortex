import { useState } from "react";
import type { CouponType } from "@vortex/shared";
import { useAdminCoupons, useCreateCoupon, useDeleteCoupon, useToggleCoupon } from "../../hooks/useCoupons";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

const TYPE_LABELS: Record<CouponType, string> = { percent: "%", fixed: "R$", free_shipping: "Frete" };

export function AdminCouponsPage() {
  const { data: coupons = [], isLoading } = useAdminCoupons();
  const createCoupon = useCreateCoupon();
  const toggleCoupon = useToggleCoupon();
  const deleteCoupon = useDeleteCoupon();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    type: "percent" as CouponType,
    value: "",
    minOrder: "0",
    maxUses: "100",
    expiresAt: "",
  });

  function handleSave() {
    if (!form.code) {
      showToast("Informe o código do cupom.", "error");
      return;
    }
    createCoupon.mutate(
      {
        code: form.code,
        type: form.type,
        value: parseFloat(form.value) || 0,
        minOrder: parseFloat(form.minOrder) || 0,
        maxUses: parseInt(form.maxUses, 10) || 100,
        expiresAt: form.expiresAt || "2026-12-31",
        active: true,
      },
      {
        onSuccess: () => {
          setModalOpen(false);
          showToast(`Cupom ${form.code} criado!`, "success");
          setForm({ code: "", type: "percent", value: "", minOrder: "0", maxUses: "100", expiresAt: "" });
        },
        onError: () => showToast("Não foi possível criar o cupom (código já existe?).", "error"),
      },
    );
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Cupons de Desconto</h1>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          + Novo Cupom
        </button>
      </div>
      <div className="admin-table-wrap" style={{ marginBottom: "1.5rem" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Desconto</th>
              <th>Mín. Compra</th>
              <th>Usos</th>
              <th>Validade</th>
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
            ) : (
              coupons.map((c) => (
                <tr key={c.id}>
                  <td>
                    <code
                      style={{
                        background: "var(--bg3)",
                        padding: ".2rem .6rem",
                        borderRadius: "6px",
                        fontFamily: "monospace",
                        color: "var(--cyan)",
                        fontSize: ".85rem",
                      }}
                    >
                      {c.code}
                    </code>
                  </td>
                  <td>{TYPE_LABELS[c.type]}</td>
                  <td>
                    <strong>
                      {c.type === "percent" ? `${c.value}%` : c.type === "fixed" ? `R$ ${c.value.toFixed(2)}` : "100%"}
                    </strong>
                  </td>
                  <td>{c.minOrder > 0 ? `R$ ${c.minOrder.toFixed(2)}` : "Sem mínimo"}</td>
                  <td>
                    {c.uses}/{c.maxUses}
                  </td>
                  <td style={{ fontSize: ".82rem" }}>{c.expiresAt}</td>
                  <td>
                    <span className={`status-badge ${c.active ? "status-active" : "status-inactive"}`}>
                      {c.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn" onClick={() => toggleCoupon.mutate(c.id)}>
                      {c.active ? "⏸ Pausar" : "▶ Ativar"}
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={() =>
                        deleteCoupon.mutate(c.id, { onSuccess: () => showToast("Cupom removido", "error") })
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="🎟️ Novo Cupom">
        <div className="form-group">
          <label>Código</label>
          <input
            className="admin-input"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="PROMO20"
            style={{ textTransform: "uppercase" }}
          />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Tipo</label>
            <select
              className="admin-select"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })}
            >
              <option value="percent">Percentual (%)</option>
              <option value="fixed">Valor Fixo (R$)</option>
              <option value="free_shipping">Frete Grátis</option>
            </select>
          </div>
          <div className="form-group">
            <label>Desconto</label>
            <input
              className="admin-input"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder="20"
            />
          </div>
          <div className="form-group">
            <label>Pedido Mínimo (R$)</label>
            <input
              className="admin-input"
              type="number"
              value={form.minOrder}
              onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Máx. Usos</label>
            <input
              className="admin-input"
              type="number"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Validade</label>
          <input
            className="admin-input"
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
        </div>
        <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleSave}>
          💾 Criar Cupom
        </button>
      </Modal>
    </div>
  );
}
