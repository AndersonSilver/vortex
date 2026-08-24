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
          <h3>🧮 Precificação</h3>
          <div className="form-group">
            <label>Custo de energia (R$/kWh)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={form.electricityCostPerKwh}
              onChange={(e) => set("electricityCostPerKwh", Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Custo de máquina (R$/hora)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={form.machineCostPerHour}
              onChange={(e) => set("machineCostPerHour", Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Custo de mão de obra (R$/hora)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={form.laborCostPerHour}
              onChange={(e) => set("laborCostPerHour", Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Custo fixo por hora (overhead)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={form.overheadCostPerHour}
              onChange={(e) => set("overheadCostPerHour", Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Horas produtivas por mês</label>
            <input
              className="admin-input"
              type="number"
              value={form.overheadHoursPerMonth}
              onChange={(e) => set("overheadHoursPerMonth", Number(e.target.value))}
            />
          </div>
          <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "1rem" }}>
            <label style={{ margin: 0 }}>Usar taxas calculadas dos gastos reais</label>
            <input
              type="checkbox"
              checked={form.autoCostRates}
              onChange={(e) => set("autoCostRates", e.target.checked)}
            />
          </div>
          <div className="form-group">
            <label>Taxa padrão de perda/falha (%)</label>
            <input
              className="admin-input"
              type="number"
              value={form.defaultWasteRatePercent}
              onChange={(e) => set("defaultWasteRatePercent", Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Margem padrão (%)</label>
            <input
              className="admin-input"
              type="number"
              value={form.defaultMarginPercent}
              onChange={(e) => set("defaultMarginPercent", Number(e.target.value))}
            />
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
