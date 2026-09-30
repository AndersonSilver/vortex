import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CONSIGNMENT_PAYMENT_METHOD_LABELS,
  CONSIGNMENT_PAYMENT_METHODS,
  type ConsignmentPaymentMethod,
  type ConsignmentStockDTO,
} from "@vortex/shared";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import {
  brl,
  emptyPickerRow,
  pickerToItems,
  ProductQtyPicker,
  ProductThumb,
  todayISO,
  type PickerOption,
  type PickerRow,
} from "../../components/consignment";
import { FinancialView, MovementsView } from "../../components/consignment-views";
import {
  useAddConsignmentPayment,
  useAdjustConsignmentStock,
  useConsignmentStore,
  useConsignmentStoreFinancial,
  useConsignmentStoreMovements,
  useConsignmentStoreStock,
  useConsignmentStoreUsers,
  useDeleteConsignmentPayment,
  useLinkConsignmentUser,
  useReturnFromConsignmentStore,
  useSetConsignmentTransferPrice,
  useShipToConsignmentStore,
  useUnlinkConsignmentUser,
  type ConsignmentMovementFilters,
} from "../../hooks/useConsignment";
import { useProducts } from "../../hooks/useProducts";
import { extractErrorMessage } from "../../lib/api-client";
import { StoreFormModal } from "./AdminConsignmentStoresPage";
import { RequestsTable } from "./AdminConsignmentRequestsPage";

type Tab = "stock" | "movements" | "financial" | "requests" | "users";

const TABS: { key: Tab; label: string }[] = [
  { key: "stock", label: "Estoque" },
  { key: "movements", label: "Histórico" },
  { key: "financial", label: "Financeiro" },
  { key: "requests", label: "Reposições" },
  { key: "users", label: "Usuários" },
];

export function AdminConsignmentStorePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: store, isLoading } = useConsignmentStore(id);
  const [tab, setTab] = useState<Tab>("stock");
  const [editing, setEditing] = useState(false);

  if (isLoading) return <p style={{ color: "var(--text-muted)" }}>Carregando...</p>;
  if (!store) return <p>Loja não encontrada.</p>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <button className="action-btn" onClick={() => navigate("/admin/consignados")} style={{ marginBottom: ".5rem" }}>
            ← Consignados
          </button>
          <h1>
            {store.name}{" "}
            {!store.active && <span className="status-badge status-inactive">Desativada</span>}
          </h1>
          <div style={{ color: "var(--text-muted)", fontSize: ".88rem" }}>
            {[store.contactName, store.phone, store.email, store.document].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
          </div>
        </div>
        <button className="btn-ghost" onClick={() => setEditing(true)}>
          ✏️ Editar loja
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab-btn${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stock" && <StockTab storeId={id} />}
      {tab === "movements" && <MovementsTab storeId={id} />}
      {tab === "financial" && <FinancialTab storeId={id} />}
      {tab === "requests" && <RequestsTable storeId={id} />}
      {tab === "users" && <UsersTab storeId={id} />}

      {editing && <StoreFormModal open store={store} onClose={() => setEditing(false)} />}
    </div>
  );
}

// --- Estoque -------------------------------------------------------------------------

function StockTab({ storeId }: { storeId: string }) {
  const { data: stock = [], isLoading } = useConsignmentStoreStock(storeId);
  const { data: products = [] } = useProducts("all", true);
  const ship = useShipToConsignmentStore(storeId);
  const giveBack = useReturnFromConsignmentStore(storeId);
  const adjust = useAdjustConsignmentStock(storeId);
  const setPrice = useSetConsignmentTransferPrice(storeId);
  const { showToast } = useToast();

  const [mode, setMode] = useState<"ship" | "return" | null>(null);
  const [rows, setRows] = useState<PickerRow[]>([emptyPickerRow()]);
  const [note, setNote] = useState("");
  const [priceEdit, setPriceEdit] = useState<{ row: ConsignmentStockDTO; value: string } | null>(null);
  const [adjustEdit, setAdjustEdit] = useState<{ row: ConsignmentStockDTO; change: string; note: string } | null>(null);

  const stockByProduct = new Map(stock.map((s) => [s.productId, s]));
  const shipOptions: PickerOption[] = products
    .filter((p) => p.active)
    .map((p) => {
      const current = stockByProduct.get(p.id);
      return { productId: p.id, name: p.name, hint: current ? `${current.quantity} na loja` : "novo na loja" };
    });
  const returnOptions: PickerOption[] = stock
    .filter((s) => s.quantity > 0)
    .map((s) => ({ productId: s.productId, name: s.productName, hint: `${s.quantity} na loja`, max: s.quantity }));

  function openMode(next: "ship" | "return") {
    setRows([emptyPickerRow()]);
    setNote("");
    setMode(next);
  }

  const onError = (fallback: string) => (error: unknown) => showToast(extractErrorMessage(error, fallback), "error");

  function handleSubmit() {
    const options = mode === "ship" ? shipOptions : returnOptions;
    const parsed = pickerToItems(rows, options);
    if ("error" in parsed) {
      showToast(parsed.error, "error");
      return;
    }
    if (mode === "ship") {
      const missing = parsed.items.find((i) => i.transferPrice === null && !stockByProduct.has(i.productId));
      if (missing) {
        const name = options.find((o) => o.productId === missing.productId)?.name;
        showToast(`Informe o repasse de "${name}": ele ainda não está nessa loja.`, "error");
        return;
      }
      ship.mutate(
        { items: parsed.items, note: note || null },
        {
          onSuccess: () => {
            setMode(null);
            showToast("Envio registrado!", "success");
          },
          onError: onError("Não foi possível registrar o envio."),
        },
      );
    } else {
      giveBack.mutate(
        { items: parsed.items.map(({ productId, qty }) => ({ productId, qty })), note: note || null },
        {
          onSuccess: () => {
            setMode(null);
            showToast("Devolução registrada!", "success");
          },
          onError: onError("Não foi possível registrar a devolução."),
        },
      );
    }
  }

  function handlePrice() {
    if (!priceEdit) return;
    const value = parseFloat(priceEdit.value.replace(",", "."));
    if (!(value > 0)) {
      showToast("Repasse inválido.", "error");
      return;
    }
    setPrice.mutate(
      { productId: priceEdit.row.productId, transferPrice: value },
      {
        onSuccess: () => {
          setPriceEdit(null);
          showToast("Repasse atualizado. Vale para as próximas vendas.", "success");
        },
        onError: onError("Não foi possível atualizar o repasse."),
      },
    );
  }

  function handleAdjust() {
    if (!adjustEdit) return;
    const change = parseInt(adjustEdit.change, 10);
    if (!Number.isInteger(change) || change === 0) {
      showToast("Informe quanto somar (ex.: 2) ou tirar (ex.: -2).", "error");
      return;
    }
    if (!adjustEdit.note.trim()) {
      showToast("Explique o motivo do ajuste.", "error");
      return;
    }
    adjust.mutate(
      { productId: adjustEdit.row.productId, changeQuantity: change, note: adjustEdit.note.trim() },
      {
        onSuccess: () => {
          setAdjustEdit(null);
          showToast("Estoque ajustado.", "success");
        },
        onError: onError("Não foi possível ajustar o estoque."),
      },
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: ".6rem", marginBottom: "1rem" }}>
        <button className="btn-primary" onClick={() => openMode("ship")}>
          🚚 Enviar peças
        </button>
        <button className="btn-ghost" onClick={() => openMode("return")} disabled={returnOptions.length === 0}>
          ↩️ Registrar devolução
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Na loja</th>
              <th>Repasse</th>
              <th>Valor</th>
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
            ) : stock.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  Nenhuma peça enviada para essa loja ainda.
                </td>
              </tr>
            ) : (
              stock.map((s) => (
                <tr key={s.id}>
                  <td>
                    <ProductThumb imageUrl={s.productImageUrl} emoji={s.productEmoji} name={s.productName} />
                  </td>
                  <td>{s.quantity}</td>
                  <td>{brl(s.transferPrice)}</td>
                  <td>{brl(s.stockValue)}</td>
                  <td>
                    <button className="action-btn" onClick={() => setPriceEdit({ row: s, value: s.transferPrice.toFixed(2) })}>
                      💲 Repasse
                    </button>
                    <button className="action-btn" onClick={() => setAdjustEdit({ row: s, change: "", note: "" })}>
                      ± Ajustar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode === "ship" ? "🚚 Enviar peças para a loja" : "↩️ Devolução para a Vortex"}
        size="lg"
      >
        {mode === "ship" && (
          <p style={{ color: "var(--text-muted)", marginBottom: "1rem", fontSize: ".9rem" }}>
            O repasse é obrigatório para produto novo na loja. Para os que ela já tem, deixe em branco para manter o atual
            ou preencha para mudar.
          </p>
        )}
        <ProductQtyPicker
          rows={rows}
          onChange={setRows}
          options={mode === "ship" ? shipOptions : returnOptions}
          showTransferPrice={mode === "ship"}
          transferPriceHint={(productId) => stockByProduct.get(productId)?.transferPrice ?? null}
        />
        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label>Observação (opcional)</label>
          <input className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: "1rem" }}
          onClick={handleSubmit}
          disabled={ship.isPending || giveBack.isPending}
        >
          💾 Confirmar
        </button>
      </Modal>

      <Modal open={priceEdit !== null} onClose={() => setPriceEdit(null)} title="💲 Repasse por peça">
        {priceEdit && (
          <>
            <p style={{ marginBottom: "1rem" }}>{priceEdit.row.productName}</p>
            <div className="form-group">
              <label>Repasse (R$)</label>
              <input
                className="admin-input"
                type="number"
                step="0.01"
                value={priceEdit.value}
                onChange={(e) => setPriceEdit({ ...priceEdit, value: e.target.value })}
              />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>
              Vendas já registradas continuam com o repasse da época.
            </p>
            <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handlePrice}>
              💾 Salvar
            </button>
          </>
        )}
      </Modal>

      <Modal open={adjustEdit !== null} onClose={() => setAdjustEdit(null)} title="± Ajuste de contagem">
        {adjustEdit && (
          <>
            <p style={{ marginBottom: "1rem" }}>
              {adjustEdit.row.productName} · hoje {adjustEdit.row.quantity} na loja
            </p>
            <div className="form-group">
              <label>Somar ou tirar (ex.: 2 ou -2)</label>
              <input
                className="admin-input"
                type="number"
                value={adjustEdit.change}
                onChange={(e) => setAdjustEdit({ ...adjustEdit, change: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Motivo</label>
              <input
                className="admin-input"
                value={adjustEdit.note}
                placeholder="Ex.: contagem na visita, peça quebrada"
                onChange={(e) => setAdjustEdit({ ...adjustEdit, note: e.target.value })}
              />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>
              Ajuste não gera débito. Se a peça foi vendida, peça para a loja registrar a venda.
            </p>
            <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleAdjust}>
              💾 Ajustar
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}

// --- Histórico -----------------------------------------------------------------------

function MovementsTab({ storeId }: { storeId: string }) {
  const [filters, setFilters] = useState<ConsignmentMovementFilters>({});
  const { data: movements = [], isLoading } = useConsignmentStoreMovements(storeId, filters);
  const { data: stock = [] } = useConsignmentStoreStock(storeId);
  return (
    <MovementsView
      movements={movements}
      isLoading={isLoading}
      filters={filters}
      onFiltersChange={setFilters}
      productOptions={stock.map((s) => ({ productId: s.productId, name: s.productName }))}
    />
  );
}

// --- Financeiro ----------------------------------------------------------------------

function FinancialTab({ storeId }: { storeId: string }) {
  const { data: financial, isLoading } = useConsignmentStoreFinancial(storeId);
  const addPayment = useAddConsignmentPayment(storeId);
  const deletePayment = useDeleteConsignmentPayment(storeId);
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", paidAt: todayISO(), method: "pix" as ConsignmentPaymentMethod, note: "" });

  function handleSave() {
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!(amount > 0)) {
      showToast("Informe o valor recebido.", "error");
      return;
    }
    addPayment.mutate(
      { amount, paidAt: form.paidAt, method: form.method, note: form.note || null },
      {
        onSuccess: () => {
          setOpen(false);
          showToast("Pagamento lançado!", "success");
        },
        onError: (error) => showToast(extractErrorMessage(error, "Não foi possível lançar o pagamento."), "error"),
      },
    );
  }

  if (isLoading || !financial) return <p style={{ color: "var(--text-muted)" }}>Carregando...</p>;

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <button
          className="btn-primary"
          onClick={() => {
            setForm({ amount: financial.balanceDue > 0 ? financial.balanceDue.toFixed(2) : "", paidAt: todayISO(), method: "pix", note: "" });
            setOpen(true);
          }}
        >
          💰 Lançar pagamento recebido
        </button>
      </div>
      <FinancialView
        financial={financial}
        onDeletePayment={(paymentId) => {
          if (!window.confirm("Excluir esse pagamento? O saldo da loja volta a subir.")) return;
          deletePayment.mutate(paymentId, {
            onSuccess: () => showToast("Pagamento excluído.", "info"),
            onError: (error) => showToast(extractErrorMessage(error), "error"),
          });
        }}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="💰 Pagamento recebido">
        <div className="form-grid">
          <div className="form-group">
            <label>Valor (R$)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Data</label>
            <input
              className="admin-input"
              type="date"
              value={form.paidAt}
              onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Forma</label>
            <select
              className="admin-select"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value as ConsignmentPaymentMethod })}
            >
              {CONSIGNMENT_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {CONSIGNMENT_PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Observação (opcional)</label>
          <input className="admin-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: "1rem" }}
          onClick={handleSave}
          disabled={addPayment.isPending}
        >
          💾 Lançar
        </button>
      </Modal>
    </div>
  );
}

// --- Usuários ------------------------------------------------------------------------

function UsersTab({ storeId }: { storeId: string }) {
  const { data: users = [], isLoading } = useConsignmentStoreUsers(storeId);
  const link = useLinkConsignmentUser(storeId);
  const unlink = useUnlinkConsignmentUser(storeId);
  const { showToast } = useToast();
  const [email, setEmail] = useState("");

  function handleLink() {
    if (!email.trim()) return;
    link.mutate(email.trim(), {
      onSuccess: (user) => {
        setEmail("");
        showToast(`${user.name} agora acessa o painel da loja.`, "success");
      },
      onError: (error) => showToast(extractErrorMessage(error, "Não foi possível ligar o usuário."), "error"),
    });
  }

  return (
    <div>
      <p style={{ color: "var(--text-muted)", marginBottom: "1rem", maxWidth: 720 }}>
        A pessoa precisa ter conta no site (cadastro ou login com Google). Ao ligar, o perfil dela vira “consignado” e ela
        passa a ver só o painel desta loja. Ao remover, volta a ser cliente comum.
      </p>
      <div style={{ display: "flex", gap: ".6rem", marginBottom: "1rem", maxWidth: 560 }}>
        <input
          className="admin-input"
          type="email"
          placeholder="email@da-pessoa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLink()}
        />
        <button className="btn-primary" onClick={handleLink} disabled={link.isPending}>
          Ligar
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ color: "var(--text-muted)" }}>
                  Ninguém tem acesso a essa loja ainda.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <button
                      className="action-btn danger"
                      onClick={() => {
                        if (!window.confirm(`Tirar o acesso de ${u.name} à loja?`)) return;
                        unlink.mutate(u.id, {
                          onSuccess: () => showToast("Acesso removido.", "info"),
                          onError: (error) => showToast(extractErrorMessage(error), "error"),
                        });
                      }}
                    >
                      Remover acesso
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
