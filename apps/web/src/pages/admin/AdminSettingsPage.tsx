import { useEffect, useState } from "react";
import type { StoreSettingsDTO } from "@vortex/shared";
import { useStoreSettings, useUpdateSettings } from "../../hooks/useSettings";
import { useToast } from "../../components/Toast";

export function AdminSettingsPage() {
  const { data: settings } = useStoreSettings();
  const updateSettings = useUpdateSettings();
  const { showToast } = useToast();
  const [form, setForm] = useState<StoreSettingsDTO | null>(null);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (!form) {
    return <p style={{ color: "var(--text-muted)" }}>Carregando configurações...</p>;
  }

  function handleSave() {
    if (!form) return;
    updateSettings.mutate(form, {
      onSuccess: () => showToast("Configurações salvas!", "success"),
      onError: () => showToast("Não foi possível salvar as configurações.", "error"),
    });
  }

  function set<K extends keyof StoreSettingsDTO>(key: K, value: StoreSettingsDTO[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Configurações</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
        <div className="admin-form">
          <h3>🏢 Dados da Loja</h3>
          <div className="form-group">
            <label>Nome da loja</label>
            <input className="admin-input" value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
          </div>
          <div className="form-group">
            <label>E-mail</label>
            <input className="admin-input" value={form.storeEmail} onChange={(e) => set("storeEmail", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Telefone</label>
            <input className="admin-input" value={form.storePhone} onChange={(e) => set("storePhone", e.target.value)} />
          </div>
          <div className="form-group">
            <label>CNPJ</label>
            <input className="admin-input" value={form.storeCnpj} onChange={(e) => set("storeCnpj", e.target.value)} />
          </div>
          <button className="btn-primary" onClick={handleSave}>
            Salvar
          </button>
        </div>

        <div className="admin-form">
          <h3>🚚 Frete & Entrega</h3>
          <div className="form-group">
            <label>Frete grátis acima de (R$)</label>
            <input
              className="admin-input"
              type="number"
              value={form.freeShippingThreshold}
              onChange={(e) => set("freeShippingThreshold", Number(e.target.value))}
            />
          </div>
          <button className="btn-primary" onClick={handleSave}>
            Salvar
          </button>
        </div>

        <div className="admin-form">
          <h3>💳 Pagamentos</h3>
          <div className="form-group">
            <label>Desconto PIX (%)</label>
            <input
              className="admin-input"
              type="number"
              value={form.pixDiscountPercent}
              onChange={(e) => set("pixDiscountPercent", Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Desconto Boleto (%)</label>
            <input
              className="admin-input"
              type="number"
              value={form.boletoDiscountPercent}
              onChange={(e) => set("boletoDiscountPercent", Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Parcelas sem juros</label>
            <input
              className="admin-input"
              type="number"
              value={form.installmentsWithoutInterest}
              onChange={(e) => set("installmentsWithoutInterest", Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Chave PIX</label>
            <input className="admin-input" value={form.pixKey} onChange={(e) => set("pixKey", e.target.value)} />
          </div>
          <button className="btn-primary" onClick={handleSave}>
            Salvar
          </button>
        </div>

        <div className="admin-form">
          <h3>📧 Notificações</h3>
          <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "1rem" }}>
            <label style={{ margin: 0 }}>Novo pedido</label>
            <input
              type="checkbox"
              checked={form.notifyNewOrder}
              onChange={(e) => set("notifyNewOrder", e.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: "var(--purple)" }}
            />
          </div>
          <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "1rem" }}>
            <label style={{ margin: 0 }}>Pagamento confirmado</label>
            <input
              type="checkbox"
              checked={form.notifyPaymentConfirmed}
              onChange={(e) => set("notifyPaymentConfirmed", e.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: "var(--purple)" }}
            />
          </div>
          <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "1rem" }}>
            <label style={{ margin: 0 }}>Estoque baixo</label>
            <input
              type="checkbox"
              checked={form.notifyLowStock}
              onChange={(e) => set("notifyLowStock", e.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: "var(--purple)" }}
            />
          </div>
          <button className="btn-primary" onClick={handleSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
