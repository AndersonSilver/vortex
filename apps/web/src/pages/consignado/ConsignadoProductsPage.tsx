import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ConsignmentStockDTO } from "@vortex/shared";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import {
  brl,
  emptyPickerRow,
  LOW_STOCK,
  pickerToItems,
  ProductQtyPicker,
  ProductThumb,
  relativeDay,
  type PickerOption,
  type PickerRow,
} from "../../components/consignment";
import {
  useMyConsignmentMovements,
  useMyConsignmentRequests,
  useMyConsignmentStock,
  useRegisterConsignmentSale,
  type ConsignmentMovementFilters,
} from "../../hooks/useConsignment";
import { extractErrorMessage } from "../../lib/api-client";

type Tab = "in" | "out";

const SALES: ConsignmentMovementFilters = { type: "sale" };

export function ConsignadoProductsPage() {
  const { data: stock = [], isLoading } = useMyConsignmentStock();
  const { data: sales = [] } = useMyConsignmentMovements(SALES);
  const { data: requests = [] } = useMyConsignmentRequests();
  const registerSale = useRegisterConsignmentSale();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("in");
  const [search, setSearch] = useState("");
  const [saleOpen, setSaleOpen] = useState(false);
  const [rows, setRows] = useState<PickerRow[]>([emptyPickerRow()]);
  const [note, setNote] = useState("");

  const { inStock, outOfStock } = useMemo(
    () => ({ inStock: stock.filter((s) => s.quantity > 0), outOfStock: stock.filter((s) => s.quantity === 0) }),
    [stock],
  );

  const filtered = useMemo(() => {
    const list = tab === "in" ? inStock : outOfStock;
    const term = search.trim().toLowerCase();
    return term
      ? list.filter((s) => s.productName.toLowerCase().includes(term) || (s.productSku ?? "").toLowerCase().includes(term))
      : list;
  }, [inStock, outOfStock, tab, search]);

  // Peças vendidas e última venda por produto. Os movimentos vêm do mais novo pro mais antigo.
  const salesByProduct = useMemo(() => {
    const byProduct = new Map<string, { pieces: number; lastAt: string }>();
    for (const m of sales) {
      const row = byProduct.get(m.productId) ?? { pieces: 0, lastAt: m.createdAt };
      row.pieces -= m.changeQuantity;
      byProduct.set(m.productId, row);
    }
    return byProduct;
  }, [sales]);

  const requestedProductIds = useMemo(
    () =>
      new Set(
        requests
          .filter((r) => r.status === "pending" || r.status === "approved")
          .flatMap((r) => r.items.map((i) => i.productId)),
      ),
    [requests],
  );

  const columns = tab === "in" ? 6 : 4;
  const emptyMessage = isLoading
    ? "Carregando..."
    : filtered.length > 0
      ? null
      : stock.length === 0
        ? "A Vortex ainda não enviou peças para a sua loja."
        : search.trim()
          ? "Nenhum produto encontrado."
          : tab === "in"
            ? "Nenhuma peça em loja no momento."
            : "Todos os produtos estão com estoque.";
  const runningLow = inStock.filter((s) => s.quantity <= LOW_STOCK).length;

  const options: PickerOption[] = inStock.map((s) => ({
    productId: s.productId,
    name: s.productName,
    hint: `${s.quantity} em loja`,
    max: s.quantity,
  }));

  const totals = stock.reduce(
    (acc, s) => ({ pieces: acc.pieces + s.quantity, value: acc.value + s.stockValue }),
    { pieces: 0, value: 0 },
  );

  function openSale(productId?: string) {
    setRows([productId ? { ...emptyPickerRow(), productId } : emptyPickerRow()]);
    setNote("");
    setSaleOpen(true);
  }

  function askRestock(productId: string) {
    navigate("/consignado/reposicao", { state: { productId } });
  }

  /** `compact` cabe numa linha: usado no card do celular, onde o rótulo "Vendidas" já está em cima. */
  function soldCell(productId: string, compact = false) {
    const sold = salesByProduct.get(productId);
    if (!sold) {
      return <span className="sold-empty">{compact ? "—" : "Nenhuma venda ainda"}</span>;
    }
    if (compact) {
      return (
        <>
          <strong>{sold.pieces}</strong>
          <span style={{ color: "var(--text-muted)" }}> · {relativeDay(new Date(sold.lastAt))}</span>
        </>
      );
    }
    return (
      <div className="sold-cell">
        <div>
          <strong>{sold.pieces}</strong> {sold.pieces === 1 ? "peça vendida" : "peças vendidas"}
        </div>
        <div className="sold-last">Última venda {relativeDay(new Date(sold.lastAt))}</div>
      </div>
    );
  }

  function stockBadge(s: ConsignmentStockDTO) {
    return s.quantity <= LOW_STOCK ? (
      <span className="status-badge status-pending">{s.quantity} un · acabando</span>
    ) : (
      <span className="status-badge status-active">{s.quantity} un</span>
    );
  }

  /** Botões da linha: vender e repor na aba Em estoque, pedir reposição na Sem estoque. */
  function rowActions(s: ConsignmentStockDTO) {
    const requested = requestedProductIds.has(s.productId);
    if (tab === "in") {
      return (
        <>
          <button className="action-btn sale" onClick={() => openSale(s.productId)}>
            🧾 Vendi
          </button>
          {s.quantity <= LOW_STOCK &&
            (requested ? (
              <span className="status-badge status-pending">Reposição pedida</span>
            ) : (
              <button className="action-btn restock" onClick={() => askRestock(s.productId)}>
                📦 Repor
              </button>
            ))}
        </>
      );
    }
    return requested ? (
      <>
        <span className="status-badge status-pending">Reposição pedida</span>
        <button className="action-btn" onClick={() => navigate("/consignado/reposicao")}>
          Ver pedido
        </button>
      </>
    ) : (
      <button className="action-btn restock" onClick={() => askRestock(s.productId)}>
        📦 Pedir reposição
      </button>
    );
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

      <div className="tabs">
        <button className={`tab-btn${tab === "in" ? " active" : ""}`} onClick={() => setTab("in")}>
          Em estoque ({inStock.length})
        </button>
        <button className={`tab-btn${tab === "out" ? " active" : ""}`} onClick={() => setTab("out")}>
          Sem estoque ({outOfStock.length})
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <div className="search-wrap" style={{ flex: "1 1 260px" }}>
          <span className="search-icon">🔍</span>
          <input placeholder="Buscar por nome ou SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="stock-summary">
          <div className="stock-summary-item">
            <span className="stock-summary-icon">📦</span>
            <div>
              <div className="stock-summary-label">Peças em loja</div>
              <div className="stock-summary-value">{totals.pieces}</div>
            </div>
          </div>
          <div className="stock-summary-item">
            <span className="stock-summary-icon">💰</span>
            <div>
              <div className="stock-summary-label">Valor a preço de repasse</div>
              <div className="stock-summary-value">{brl(totals.value)}</div>
            </div>
          </div>
          {runningLow > 0 && (
            <button
              className="stock-summary-item stock-summary-link"
              onClick={() => navigate("/consignado/reposicao")}
              title="Ver sugestões de reposição"
            >
              <span className="stock-summary-icon">⚠️</span>
              <div>
                <div className="stock-summary-label">Acabando</div>
                <div className="stock-summary-value">
                  {runningLow} {runningLow === 1 ? "produto" : "produtos"} →
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="admin-table-wrap desktop-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Repasse (por peça)</th>
              {tab === "in" ? (
                <>
                  <th>Em loja</th>
                  <th>Total</th>
                  <th>Vendidas</th>
                  <th></th>
                </>
              ) : (
                <>
                  <th>Vendidas</th>
                  <th style={{ textAlign: "right" }}>Reposição</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {emptyMessage ? (
              <tr>
                <td colSpan={columns} style={{ color: "var(--text-muted)" }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <ProductThumb
                      imageUrl={s.productImageUrl}
                      emoji={s.productEmoji}
                      name={s.productName}
                      subtitle={s.productSku && `SKU ${s.productSku}`}
                    />
                  </td>
                  <td>
                    <strong>{brl(s.transferPrice)}</strong>
                  </td>
                  {tab === "in" && (
                    <>
                      <td>{stockBadge(s)}</td>
                      <td>{brl(s.stockValue)}</td>
                    </>
                  )}
                  <td>{soldCell(s.productId)}</td>
                  <td>
                    <div className="row-actions">{rowActions(s)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* No celular a tabela vira um card por produto. */}
      <div className="mobile-cards">
        {emptyMessage ? (
          <div className="mobile-card" style={{ color: "var(--text-muted)" }}>
            {emptyMessage}
          </div>
        ) : (
          filtered.map((s) => (
            <div className="mobile-card" key={s.id}>
              <div className="mobile-card-top">
                <ProductThumb
                  imageUrl={s.productImageUrl}
                  emoji={s.productEmoji}
                  name={s.productName}
                  subtitle={s.productSku && `SKU ${s.productSku}`}
                />
                {tab === "in" && stockBadge(s)}
              </div>
              <div className="mobile-card-stats">
                <div>
                  <span className="mobile-card-label">Repasse</span>
                  <strong>{brl(s.transferPrice)}</strong>
                </div>
                {tab === "in" && (
                  <div>
                    <span className="mobile-card-label">Total</span>
                    {brl(s.stockValue)}
                  </div>
                )}
                <div>
                  <span className="mobile-card-label">Vendidas</span>
                  {soldCell(s.productId, true)}
                </div>
              </div>
              <div className="mobile-card-actions">{rowActions(s)}</div>
            </div>
          ))
        )}
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
