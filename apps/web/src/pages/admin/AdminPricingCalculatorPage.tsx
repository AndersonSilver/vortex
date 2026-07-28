import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ProductInput } from "@vortex/shared";
import { useFilaments } from "../../hooks/useFilaments";
import { useProducts, useUpdateProduct } from "../../hooks/useProducts";
import { usePrinters } from "../../hooks/usePrinters";
import { useStoreSettings } from "../../hooks/useSettings";
import { useToast } from "../../components/Toast";

// Potência de referência usada quando nenhuma impressora cadastrada é selecionada.
const REFERENCE_PRINTER_WATTAGE = 150;

export function AdminPricingCalculatorPage() {
  const [searchParams] = useSearchParams();
  const preselectedProductId = searchParams.get("productId") ?? "";

  const { data: filaments = [] } = useFilaments();
  const { data: products = [] } = useProducts("all", true);
  const { data: printers = [] } = usePrinters();
  const { data: settings } = useStoreSettings();
  const updateProduct = useUpdateProduct();
  const { showToast } = useToast();

  const [printerId, setPrinterId] = useState("");
  const [filamentId, setFilamentId] = useState("");
  const [weightGrams, setWeightGrams] = useState("20");
  const [printTimeMinutes, setPrintTimeMinutes] = useState("120");
  const [laborMinutes, setLaborMinutes] = useState("10");
  const [packagingCost, setPackagingCost] = useState("3");
  const [wastePercent, setWastePercent] = useState(settings?.defaultWasteRatePercent ?? 5);
  const [marginPercent, setMarginPercent] = useState(settings?.defaultMarginPercent ?? 40);
  const [targetProductId, setTargetProductId] = useState(preselectedProductId);

  const filament = filaments.find((f) => f.id === filamentId);
  const printer = printers.find((p) => p.id === printerId);

  const result = useMemo(() => {
    const weight = parseFloat(weightGrams) || 0;
    const printHours = (parseFloat(printTimeMinutes) || 0) / 60;
    const laborHours = (parseFloat(laborMinutes) || 0) / 60;
    const packaging = parseFloat(packagingCost) || 0;
    const costPerGram = filament ? filament.costPerSpool / filament.spoolWeightGrams : 0;
    const electricityCostPerKwh = settings?.electricityCostPerKwh ?? 0.9;
    const machineCostPerHour = settings?.machineCostPerHour ?? 2;
    const laborCostPerHour = settings?.laborCostPerHour ?? 20;
    const wattage = printer?.wattage ?? REFERENCE_PRINTER_WATTAGE;

    const materialCost = weight * costPerGram;
    const energyCost = printHours * (wattage / 1000) * electricityCostPerKwh;
    const machineCost = printHours * machineCostPerHour;
    const laborCost = laborHours * laborCostPerHour;
    const subtotal = materialCost + energyCost + machineCost + laborCost + packaging;
    const costWithWaste = subtotal * (1 + wastePercent / 100);
    const suggestedPrice = marginPercent < 100 ? costWithWaste / (1 - marginPercent / 100) : costWithWaste;
    const printsPerSpool = filament && weight > 0 ? Math.floor(filament.spoolWeightGrams / weight) : null;

    return {
      costPerGram,
      materialCost,
      energyCost,
      machineCost,
      laborCost,
      packaging,
      subtotal,
      costWithWaste,
      suggestedPrice,
      printsPerSpool,
      wattage,
    };
  }, [filament, printer, weightGrams, printTimeMinutes, laborMinutes, packagingCost, wastePercent, marginPercent, settings]);

  function handleApplyToProduct() {
    const product = products.find((p) => p.id === targetProductId);
    if (!product) {
      showToast("Selecione um produto para aplicar o preço.", "error");
      return;
    }
    const input: ProductInput = {
      name: product.name,
      category: product.category,
      description: product.description,
      price: Number(result.suggestedPrice.toFixed(2)),
      oldPrice: product.oldPrice,
      emoji: product.emoji,
      imageUrl: product.imageUrl,
      videoUrl: product.videoUrl,
      badge: product.badge,
      colors: product.colors,
      material: product.material,
      specs: product.specs,
      stock: product.stock,
      active: product.active,
      filamentId: filamentId || null,
      weightGrams: parseFloat(weightGrams) || null,
      printTimeMinutes: parseInt(printTimeMinutes, 10) || null,
      costPrice: Number(result.costWithWaste.toFixed(2)),
    };
    updateProduct.mutate(
      { id: product.id, input },
      {
        onSuccess: () => showToast(`Preço aplicado a "${product.name}"!`, "success"),
        onError: () => showToast("Não foi possível aplicar o preço ao produto.", "error"),
      },
    );
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Calculadora de Preço</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
        <div className="admin-form">
          <h3>🧵 Filamento & Impressão</h3>
          <div className="form-group">
            <label>Impressora</label>
            <select className="admin-select" value={printerId} onChange={(e) => setPrinterId(e.target.value)}>
              <option value="">Potência de referência ({REFERENCE_PRINTER_WATTAGE}W)</option>
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.wattage}W)
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Filamento</label>
            <select className="admin-select" value={filamentId} onChange={(e) => setFilamentId(e.target.value)}>
              <option value="">Sem filamento (custo manual)</option>
              {filaments.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.brand} · {f.color} ({f.remainingWeightGrams}g restantes)
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Peso usado (g)</label>
            <input
              className="admin-input"
              type="number"
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Tempo de impressão (min)</label>
            <input
              className="admin-input"
              type="number"
              value={printTimeMinutes}
              onChange={(e) => setPrintTimeMinutes(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Mão de obra extra (min)</label>
            <input
              className="admin-input"
              type="number"
              value={laborMinutes}
              onChange={(e) => setLaborMinutes(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Embalagem (R$)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={packagingCost}
              onChange={(e) => setPackagingCost(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Perda/falha (%)</label>
            <input
              className="admin-input"
              type="number"
              value={wastePercent}
              onChange={(e) => setWastePercent(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Margem desejada (%)</label>
            <input
              className="admin-input"
              type="number"
              value={marginPercent}
              onChange={(e) => setMarginPercent(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="admin-form">
          <h3>💰 Resultado</h3>
          <div style={{ fontSize: ".88rem", lineHeight: 2, color: "var(--text-muted)" }}>
            <div>Material: R$ {result.materialCost.toFixed(2)}</div>
            <div>Energia: R$ {result.energyCost.toFixed(2)} ({result.wattage}W)</div>
            <div>Máquina: R$ {result.machineCost.toFixed(2)}</div>
            <div>Mão de obra: R$ {result.laborCost.toFixed(2)}</div>
            <div>Embalagem: R$ {result.packaging.toFixed(2)}</div>
            <div>Subtotal: R$ {result.subtotal.toFixed(2)}</div>
            <div>Custo com perda: R$ {result.costWithWaste.toFixed(2)}</div>
          </div>
          <h2 style={{ marginTop: "1rem" }}>Preço sugerido: R$ {result.suggestedPrice.toFixed(2)}</h2>
          {filament && (
            <p style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>
              Custo/g: R$ {result.costPerGram.toFixed(4)} · Custo/kg: R$ {(result.costPerGram * 1000).toFixed(2)}
              {result.printsPerSpool !== null && <> · ~{result.printsPerSpool} peças por rolo</>}
            </p>
          )}

          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label>Aplicar a um produto existente</label>
            <select className="admin-select" value={targetProductId} onChange={(e) => setTargetProductId(e.target.value)}>
              <option value="">Selecione um produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" style={{ width: "100%" }} onClick={handleApplyToProduct}>
            Aplicar preço ao produto
          </button>
        </div>
      </div>
    </div>
  );
}
