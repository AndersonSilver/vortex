import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ProductInput } from "@vortex/shared";
import { useFilaments } from "../../hooks/useFilaments";
import { useProducts, useUpdateProduct } from "../../hooks/useProducts";
import { usePrinters } from "../../hooks/usePrinters";
import { useStoreSettings } from "../../hooks/useSettings";
import { useCostRates } from "../../hooks/useExpenses";
import { useToast } from "../../components/Toast";
import { brl } from "../../lib/format";

// Potência de referência usada quando nenhuma impressora cadastrada é selecionada.
const REFERENCE_PRINTER_WATTAGE = 150;

export function AdminPricingCalculatorPage() {
  const [searchParams] = useSearchParams();
  const preselectedProductId = searchParams.get("productId") ?? "";

  const { data: filaments = [] } = useFilaments();
  const { data: products = [] } = useProducts("all", true);
  const { data: printers = [] } = usePrinters();
  const { data: settings } = useStoreSettings();
  const { data: costRates } = useCostRates();
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
  const resultRef = useRef<HTMLDivElement>(null);

  // Margem e perda padrão vêm das configurações, que chegam depois do primeiro render.
  const settingsApplied = useRef(false);
  useEffect(() => {
    if (!settings || settingsApplied.current) return;
    settingsApplied.current = true;
    setWastePercent(settings.defaultWasteRatePercent);
    setMarginPercent(settings.defaultMarginPercent);
  }, [settings]);

  // Vindo do "Calcular preço" de um produto: carrega o filamento, o peso e o tempo salvos nele.
  const productApplied = useRef(false);
  useEffect(() => {
    if (!preselectedProductId || productApplied.current) return;
    const product = products.find((p) => p.id === preselectedProductId);
    if (!product) return;
    productApplied.current = true;
    if (product.filamentId) setFilamentId(product.filamentId);
    if (product.weightGrams) setWeightGrams(String(product.weightGrams));
    if (product.printTimeMinutes) setPrintTimeMinutes(String(product.printTimeMinutes));
  }, [products, preselectedProductId]);

  const filament = filaments.find((f) => f.id === filamentId);
  const printer = printers.find((p) => p.id === printerId);

  const result = useMemo(() => {
    const weight = parseFloat(weightGrams) || 0;
    const printHours = (parseFloat(printTimeMinutes) || 0) / 60;
    const laborHours = (parseFloat(laborMinutes) || 0) / 60;
    const packaging = parseFloat(packagingCost) || 0;
    const costPerGram = filament ? filament.costPerSpool / filament.spoolWeightGrams : 0;
    const electricityCostPerKwh = settings?.electricityCostPerKwh ?? 0.9;
    // Com taxas automáticas ligadas, valem os números derivados dos gastos reais.
    const useAuto = settings?.autoCostRates && costRates;
    const machineCostPerHour = useAuto
      ? costRates!.suggestedMachineCostPerHour
      : (settings?.machineCostPerHour ?? 2);
    const overheadCostPerHour = useAuto
      ? costRates!.suggestedOverheadCostPerHour
      : (settings?.overheadCostPerHour ?? 0);
    const laborCostPerHour = settings?.laborCostPerHour ?? 20;
    const wattage = printer?.wattage ?? REFERENCE_PRINTER_WATTAGE;

    const materialCost = weight * costPerGram;
    const energyCost = printHours * (wattage / 1000) * electricityCostPerKwh;
    const machineCost = printHours * machineCostPerHour;
    const laborCost = laborHours * laborCostPerHour;
    // O custo fixo é rateado pelas horas que a peça ocupa da operação.
    const overheadCost = (printHours + laborHours) * overheadCostPerHour;
    const subtotal = materialCost + energyCost + machineCost + laborCost + overheadCost + packaging;
    const costWithWaste = subtotal * (1 + wastePercent / 100);
    const suggestedPrice = marginPercent < 100 ? costWithWaste / (1 - marginPercent / 100) : costWithWaste;
    const printsPerSpool = filament && weight > 0 ? Math.floor(filament.spoolWeightGrams / weight) : null;

    return {
      costPerGram,
      materialCost,
      energyCost,
      machineCost,
      laborCost,
      overheadCost,
      packaging,
      subtotal,
      costWithWaste,
      suggestedPrice,
      printsPerSpool,
      wattage,
    };
  }, [filament, printer, weightGrams, printTimeMinutes, laborMinutes, packagingCost, wastePercent, marginPercent, settings, costRates]);

  function handleApplyToProduct() {
    const product = products.find((p) => p.id === targetProductId);
    if (!product) {
      showToast("Selecione um produto para aplicar o preço.", "error");
      return;
    }
    const input: ProductInput = {
      name: product.name,
      sku: product.sku,
      marketplaceAliases: product.marketplaceAliases,
      category: product.category,
      description: product.description,
      price: Number(result.suggestedPrice.toFixed(2)),
      oldPrice: product.oldPrice,
      emoji: product.emoji,
      imageUrl: product.imageUrl,
      images: product.images,
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

  const targetProduct = products.find((p) => p.id === targetProductId);
  const preselectedProduct = products.find((p) => p.id === preselectedProductId);
  const price = result.suggestedPrice;
  const profit = price - result.costWithWaste;
  // Composição do preço sugerido: cada custo e o lucro, em R$ e em % do preço.
  const composition = [
    { label: "Material", value: result.materialCost },
    { label: `Energia (${result.wattage}W)`, value: result.energyCost },
    { label: "Máquina", value: result.machineCost },
    { label: "Mão de obra", value: result.laborCost },
    { label: "Custo fixo rateado", value: result.overheadCost },
    { label: "Embalagem", value: result.packaging },
    { label: `Perda/falha (${wastePercent}%)`, value: result.costWithWaste - result.subtotal },
    { label: `Lucro (${marginPercent}%)`, value: profit, profit: true },
  ];

  function numberField(label: string, value: string | number, onChange: (value: string) => void, step?: string) {
    return (
      <div className="form-group" style={{ margin: 0 }}>
        <label>{label}</label>
        <input
          className="admin-input"
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="pricing-page">
      <div className="admin-header">
        <h1>Calculadora de Preço</h1>
      </div>

      {preselectedProduct && (
        <p style={{ color: "var(--text-muted)", fontSize: ".88rem", marginTop: "-1rem", marginBottom: "1.2rem" }}>
          Calculando para <strong style={{ color: "var(--text)" }}>{preselectedProduct.name}</strong>. Os dados de impressão
          salvos no produto já foram carregados.
        </p>
      )}

      <div className="panel-grid pricing-grid">
        <div className="admin-form">
          <h3>🧵 Peça e impressão</h3>
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
            {filament && (
              <p style={{ color: "var(--text-muted)", fontSize: ".78rem", marginTop: ".4rem" }}>
                {brl(result.costPerGram * 1000)}/kg
                {result.printsPerSpool !== null && <> · ~{result.printsPerSpool} peças por rolo</>}
              </p>
            )}
          </div>
          <div className="pricing-fields">
            {numberField("Peso usado (g)", weightGrams, setWeightGrams)}
            {numberField("Tempo de impressão (min)", printTimeMinutes, setPrintTimeMinutes)}
            {numberField("Mão de obra extra (min)", laborMinutes, setLaborMinutes)}
            {numberField("Embalagem (R$)", packagingCost, setPackagingCost, "0.01")}
          </div>

          <h3 style={{ marginTop: "1.6rem" }}>📈 Perda e margem</h3>
          <div className="pricing-fields">
            {numberField("Perda/falha (%)", wastePercent, (v) => setWastePercent(Number(v)))}
            {numberField("Margem desejada (%)", marginPercent, (v) => setMarginPercent(Number(v)))}
          </div>
        </div>

        <div className="admin-form pricing-result" ref={resultRef}>
          <h3>💰 Resultado</h3>
          <div className="kpi-label">Preço sugerido</div>
          <div className="kpi-value">{brl(price)}</div>
          <div style={{ color: "var(--text-muted)", fontSize: ".85rem", margin: ".3rem 0 1.4rem" }}>
            Custo {brl(result.costWithWaste)} · Lucro <span style={{ color: "var(--text)" }}>{brl(profit)}</span> por peça
          </div>

          <ul className="pricing-breakdown">
            {composition.map((row) => (
              <li key={row.label}>
                <div className="pricing-breakdown-row">
                  <span>{row.label}</span>
                  <span>
                    {brl(row.value)}
                    <span className="pricing-breakdown-pct">
                      {price > 0 ? `${Math.round((row.value / price) * 100)}%` : "—"}
                    </span>
                  </span>
                </div>
                <div className="top-products-track">
                  <div
                    className="top-products-bar"
                    style={{
                      width: `${price > 0 ? Math.max(0, (row.value / price) * 100) : 0}%`,
                      background: row.profit ? "var(--cyan)" : undefined,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="form-group" style={{ marginTop: "1.4rem" }}>
            <label>Aplicar a um produto existente</label>
            <select className="admin-select" value={targetProductId} onChange={(e) => setTargetProductId(e.target.value)}>
              <option value="">Selecione um produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {targetProduct && (
              <p style={{ fontSize: ".85rem", marginTop: ".5rem", color: "var(--text-muted)" }}>
                Preço atual {brl(targetProduct.price)} → <strong style={{ color: "var(--text)" }}>{brl(price)}</strong>
                {targetProduct.price > 0 && (
                  <> ({price >= targetProduct.price ? "+" : ""}
                    {(((price - targetProduct.price) / targetProduct.price) * 100).toFixed(1).replace(".", ",")}%)
                  </>
                )}
              </p>
            )}
          </div>
          <button className="btn-primary" style={{ width: "100%" }} onClick={handleApplyToProduct}>
            Aplicar preço ao produto
          </button>
        </div>
      </div>

      {/* Celular: o preço fica sempre à vista enquanto os campos são editados. */}
      <button
        className="pricing-sticky"
        onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      >
        <span>
          <span className="kpi-label" style={{ display: "block", marginBottom: 0 }}>
            Preço sugerido
          </span>
          <strong style={{ fontSize: "1.15rem" }}>{brl(price)}</strong>
          <span style={{ color: "var(--text-muted)", fontSize: ".8rem" }}> · custo {brl(result.costWithWaste)}</span>
        </span>
        <span style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>Detalhes ↓</span>
      </button>
    </div>
  );
}
