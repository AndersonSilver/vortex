import { useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import {
  brl,
  emptyPickerRow,
  pickerToItems,
  ProductQtyPicker,
  ProductThumb,
  type PickerOption,
  type PickerRow,
} from "../../components/consignment";
import { useMyConsignmentStock, useRegisterConsignmentSale } from "../../hooks/useConsignment";
import { extractErrorMessage } from "../../lib/api-client";

export function ConsignadoProductsPage() {
  const { data: stock = [], isLoading } = useMyConsignmentStock();
  const registerSale = useRegisterConsignmentSale();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [saleOpen, setSaleOpen] = useState(false);
  const [rows, setRows] = useState<PickerRow[]>([emptyPickerRow()]);
  const [note, setNote] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? stock.filter((s) => s.productName.toLowerCase().includes(term) || (s.productSku ?? "").toLowerCase().includes(term))
      : stock;
  }, [stock, search]);

  const options: PickerOption[] = stock
    .filter((s) => s.quantity > 0)
    .map((s) => ({ productId: s.productId, name: s.productName, hint: `${s.quantity} em loja`, max: s.quantity }));

  const totals = stock.reduce(
    (acc, s) => ({ pieces: acc.pieces + s.quantity, value: acc.value + s.stockValue }),
    { pieces: 0, value: 0 },
  );

  function openSale(productId?: string) {
    setRows([productId ? { ...emptyPickerRow(), productId } : emptyPickerRow()]);
    setNote("");
    setSaleOpen(true);
  }

  function saleTotal(): number {
    return rows.reduce((sum, row) => {
      const item = stock.find((s) => s.productId === row.productId);
      const qty = parseInt(row.qty, 10);
      return item && qty > 0 ? sum + qty * item.transferPrice : sum;
    }, 0);
  }

  function handleSale() {
    const parsed = pickerToItems(rows, options);
    if ("error" in parsed) {
      showToast(parsed.error, "error");
      return;
    }
    registerSale.mutate(
      { items: parsed.items.map(({ productId, qty }) => ({ productId, qty })), note: note || null },
      {
        onSuccess: () => {
          setSaleOpen(false);
          showToast("Venda registrada!", "success");
        },
        onError: (error) => showToast(extractErrorMessage(error, "Não foi possível registrar a venda."), "error"),
      },
    );
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Produtos na loja</h1>
        <button className="btn-primary" onClick={() => openSale()} disabled={options.length === 0}>
          🧾 Registrar venda
        </button>
      </div>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <input placeholder="Buscar por nome ou SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: ".9rem" }}>
          {totals.pieces} peças · {brl(totals.value)} a preço de repasse
        </span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>SKU</th>
              <th>Repasse (por peça)</th>
              <th>Em loja</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  {stock.length === 0 ? "A Vortex ainda não enviou peças para a sua loja." : "Nenhum produto encontrado."}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <ProductThumb imageUrl={s.productImageUrl} emoji={s.productEmoji} name={s.productName} />
                  </td>
                  <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>{s.productSku ?? "—"}</td>
                  <td>
                    <strong>{brl(s.transferPrice)}</strong>
                  </td>
                  <td>
                    <span className={`status-badge ${s.quantity > 0 ? "status-active" : "status-inactive"}`}>
                      {s.quantity} un
                    </span>
                  </td>
                  <td>{brl(s.stockValue)}</td>
                  <td>
                    <button className="action-btn" disabled={s.quantity === 0} onClick={() => openSale(s.productId)}>
                      Vendi
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={saleOpen} onClose={() => setSaleOpen(false)} title="🧾 Registrar venda" size="lg">
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem", fontSize: ".9rem" }}>
          Informe o que saiu da loja. O estoque baixa na hora e o valor entra no saldo a repassar para a Vortex.
        </p>
        <ProductQtyPicker rows={rows} onChange={setRows} options={options} />
        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label>Observação (opcional)</label>
          <input
            className="admin-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: venda de sábado"
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <span>
            A repassar: <strong>{brl(saleTotal())}</strong>
          </span>
          <button className="btn-primary" onClick={handleSale} disabled={registerSale.isPending}>
            {registerSale.isPending ? "Salvando..." : "💾 Confirmar venda"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
