import { useEffect, useState } from "react";
import {
  DISCOUNT_TYPES,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  SHIPPING_METHODS,
  type DiscountType,
  type OrderChannel,
  type OrderDTO,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type ShippingMethod,
} from "@vortex/shared";
import {
  useAdminOrders,
  useCreateManualOrder,
  useImportBlingOrders,
  useMarkOrderViewed,
  useUpdateManualOrderDiscount,
  useUpdateOrderStatus,
  useUpdateOrderTracking,
} from "../../hooks/useOrders";
import { useProducts } from "../../hooks/useProducts";
import { StatusBadge } from "../../components/StatusBadge";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { extractErrorMessage } from "../../lib/api-client";
import { fetchAddressByCep } from "../../lib/cep";
import { BR_STATES } from "../../lib/br-states";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  card: "Cartão",
  boleto: "Boleto",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  pac: "PAC",
  sedex: "SEDEX",
  pickup: "Retirada no local",
  bling: "Loja de origem (Bling)",
};

// Pedidos manuais (criados pelo admin) usam frete próprio — "bling" só existe em pedidos
// importados via webhook, não faz sentido oferecer no formulário de pedido manual.
const MANUAL_ORDER_SHIPPING_METHODS = SHIPPING_METHODS.filter((m) => m !== "bling");

const CHANNEL_BADGES: Record<OrderChannel, string> = {
  site: "🌐 Site",
  manual: "📱 Manual",
  bling: "🧾 Bling",
};

// Known marketplace names that come through Bling's originLabel — shown on their own, without
// the generic "Bling" badge, since the platform name is what's actually useful here.
const ORIGIN_LABEL_ICONS: Record<string, string> = {
  Shopee: "🛒",
  "TikTok Shop": "🎵",
};

function channelBadgeText(order: OrderDTO): string {
  if (order.channel === "bling" && order.originLabel) {
    const icon = ORIGIN_LABEL_ICONS[order.originLabel] ?? "🧾";
    return `${icon} ${order.originLabel}`;
  }
  return CHANNEL_BADGES[order.channel];
}

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percent: "Percentual (%)",
  fixed: "Valor Fixo (R$)",
};

function calcManualDiscount(type: DiscountType, value: number, subtotal: number): number {
  if (type === "percent") {
    return subtotal * (Math.min(value, 100) / 100);
  }
  return Math.min(value, subtotal);
}

interface ManualItemRow {
  productId: string;
  qty: string;
  color: string;
  material: string;
}

const EMPTY_MANUAL_ITEM: ManualItemRow = { productId: "", qty: "1", color: "", material: "" };

const EMPTY_MANUAL_ADDRESS = {
  label: "Principal",
  cep: "",
  state: "SP",
  city: "",
  neighborhood: "",
  street: "",
  number: "",
  complement: "",
};

const EMPTY_MANUAL_FORM = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  shippingMethod: "pac" as ShippingMethod,
  shippingCost: "0",
  discountType: "fixed" as DiscountType,
  discountValue: "0",
  paymentMethod: "pix" as PaymentMethod,
  paymentStatus: "pending" as PaymentStatus,
  status: "pending" as OrderStatus,
};

export function AdminOrdersPage() {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [viewOrder, setViewOrder] = useState<OrderDTO | null>(null);
  const { data: orders = [], isLoading } = useAdminOrders(filter);
  const { data: products = [] } = useProducts();
  const updateStatus = useUpdateOrderStatus();
  const updateTracking = useUpdateOrderTracking();
  const updateManualDiscount = useUpdateManualOrderDiscount();
  const createManualOrder = useCreateManualOrder();
  const importBlingOrders = useImportBlingOrders();
  const markOrderViewed = useMarkOrderViewed();
  const { showToast } = useToast();
  const [trackingInput, setTrackingInput] = useState("");
  const [discountEdit, setDiscountEdit] = useState<{ type: DiscountType; value: string }>({
    type: "fixed",
    value: "0",
  });

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM);
  const [manualAddress, setManualAddress] = useState(EMPTY_MANUAL_ADDRESS);
  const [manualItems, setManualItems] = useState<ManualItemRow[]>([{ ...EMPTY_MANUAL_ITEM }]);
  const [manualCepStatus, setManualCepStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    setTrackingInput(viewOrder?.trackingCode ?? "");
    setDiscountEdit({
      type: viewOrder?.discountType ?? "fixed",
      value: String(viewOrder?.discountValue ?? 0),
    });
  }, [viewOrder]);

  useEffect(() => {
    if (!manualModalOpen) return;
    const digits = manualAddress.cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setManualCepStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setManualCepStatus("loading");
      try {
        const result = await fetchAddressByCep(digits, controller.signal);
        if (!result) {
          setManualCepStatus("error");
          return;
        }
        setManualCepStatus("idle");
        setManualAddress((current) => ({
          ...current,
          state: result.state,
          city: result.city,
          neighborhood: result.neighborhood,
          street: result.street,
        }));
      } catch {
        if (!controller.signal.aborted) setManualCepStatus("error");
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualAddress.cep, manualModalOpen]);

  function openManualOrder() {
    setManualForm(EMPTY_MANUAL_FORM);
    setManualAddress(EMPTY_MANUAL_ADDRESS);
    setManualItems([{ ...EMPTY_MANUAL_ITEM }]);
    setManualCepStatus("idle");
    setManualModalOpen(true);
  }

  function updateManualItem(index: number, patch: Partial<ManualItemRow>) {
    setManualItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleManualProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateManualItem(index, {
      productId,
      color: product?.colors[0] ?? "",
      material: product?.material ?? "",
    });
  }

  function addManualItemRow() {
    setManualItems((prev) => [...prev, { ...EMPTY_MANUAL_ITEM }]);
  }

  function removeManualItemRow(index: number) {
    setManualItems((prev) => prev.filter((_, i) => i !== index));
  }

  const manualSubtotal = manualItems.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    const qty = parseInt(item.qty, 10) || 0;
    return sum + (product ? product.price * qty : 0);
  }, 0);
  const manualShippingCost =
    manualForm.shippingMethod === "pickup" ? 0 : parseFloat(manualForm.shippingCost) || 0;
  const manualDiscountValue = parseFloat(manualForm.discountValue) || 0;
  const manualDiscount = calcManualDiscount(manualForm.discountType, manualDiscountValue, manualSubtotal);
  const manualTotal = Math.max(0, manualSubtotal - manualDiscount + manualShippingCost);

  function handleCreateManualOrder() {
    if (!manualForm.customerName.trim()) {
      showToast("Informe o nome do cliente.", "error");
      return;
    }
    if (!manualForm.customerEmail.trim() && !manualForm.customerPhone.trim()) {
      showToast("Informe e-mail ou telefone do cliente.", "error");
      return;
    }
    if (
      !manualAddress.cep ||
      !manualAddress.city ||
      !manualAddress.neighborhood ||
      !manualAddress.street ||
      !manualAddress.number
    ) {
      showToast("Preencha o endereço de entrega completo.", "error");
      return;
    }
    const parsedItems = manualItems
      .filter((item) => item.productId && (parseInt(item.qty, 10) || 0) > 0)
      .map((item) => ({
        productId: item.productId,
        qty: parseInt(item.qty, 10),
        color: item.color.trim() || "Padrão",
        material: item.material.trim() || "Padrão",
      }));
    if (parsedItems.length === 0) {
      showToast("Adicione ao menos um item válido.", "error");
      return;
    }

    createManualOrder.mutate(
      {
        customerName: manualForm.customerName.trim(),
        customerEmail: manualForm.customerEmail.trim() || undefined,
        customerPhone: manualForm.customerPhone.trim() || undefined,
        address: {
          label: manualAddress.label,
          cep: manualAddress.cep,
          state: manualAddress.state,
          city: manualAddress.city,
          neighborhood: manualAddress.neighborhood,
          street: manualAddress.street,
          number: manualAddress.number,
          complement: manualAddress.complement.trim() || undefined,
        },
        items: parsedItems,
        shippingMethod: manualForm.shippingMethod,
        shippingCost: manualShippingCost,
        discountType: manualForm.discountType,
        discountValue: manualDiscountValue,
        paymentMethod: manualForm.paymentMethod,
        paymentStatus: manualForm.paymentStatus,
        status: manualForm.status,
      },
      {
        onSuccess: () => {
          setManualModalOpen(false);
          showToast("Pedido criado!", "success");
        },
        onError: (error) => showToast(extractErrorMessage(error, "Não foi possível criar o pedido."), "error"),
      },
    );
  }

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.marketplaceOrderNumber?.toLowerCase().includes(q) ?? false)
    );
  });

  function handleStatusChange(orderId: string, status: OrderStatus) {
    updateStatus.mutate(
      { id: orderId, status },
      {
        onSuccess: () => showToast(`Pedido atualizado!`, "info"),
        onError: () => showToast("Não foi possível atualizar o status.", "error"),
      },
    );
  }

  function handleSaveTracking() {
    if (!viewOrder || !trackingInput.trim()) return;
    updateTracking.mutate(
      { id: viewOrder.id, trackingCode: trackingInput.trim() },
      {
        onSuccess: (updated) => {
          setViewOrder(updated);
          showToast("Código de rastreio salvo!", "success");
        },
        onError: () => showToast("Não foi possível salvar o rastreio.", "error"),
      },
    );
  }

  function handleSaveDiscount() {
    if (!viewOrder) return;
    const value = parseFloat(discountEdit.value) || 0;
    if (discountEdit.type === "percent" && value > 100) {
      showToast("Desconto percentual não pode passar de 100%.", "error");
      return;
    }
    updateManualDiscount.mutate(
      { id: viewOrder.id, discountType: discountEdit.type, discountValue: value },
      {
        onSuccess: (updated) => {
          setViewOrder(updated);
          showToast("Desconto atualizado!", "success");
        },
        onError: (error) => showToast(extractErrorMessage(error, "Não foi possível atualizar o desconto."), "error"),
      },
    );
  }

  function handleImportBling() {
    importBlingOrders.mutate(undefined, {
      onSuccess: (result) => {
        if (result.failed.length > 0) {
          showToast(
            `${result.imported} pedido(s) importado(s), ${result.failed.length} falharam (SKU sem match).`,
            "error",
          );
        } else {
          showToast(
            `${result.imported} pedido(s) importado(s) do Bling (${result.alreadyExisted} já existiam).`,
            "success",
          );
        }
      },
      onError: (error) =>
        showToast(extractErrorMessage(error, "Não foi possível importar pedidos do Bling."), "error"),
    });
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Pedidos</h1>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Buscar por pedido, cliente ou nº Shopee/TikTok..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-outline" onClick={handleImportBling} disabled={importBlingOrders.isPending}>
          {importBlingOrders.isPending ? "Importando..." : "🧾 Importar do Bling"}
        </button>
        <button className="btn-primary" onClick={openManualOrder}>
          + Novo Pedido
        </button>
      </div>
      <div className="tabs">
        <button className={`tab-btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
          Todos
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            className={`tab-btn${filter === status ? " active" : ""}`}
            onClick={() => setFilter(status)}
          >
            {ORDER_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Nº Shopee/TikTok</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Valor</th>
              <th>Data</th>
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
              filtered.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontFamily: "Orbitron, monospace", fontSize: ".8rem", color: "var(--purple)", whiteSpace: "nowrap" }}>
                    {!order.viewedAt && (
                      <span
                        title="Pedido novo, ainda não visto"
                        style={{
                          display: "inline-block",
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "var(--purple)",
                          marginRight: ".4rem",
                        }}
                      />
                    )}
                    {order.orderNumber}
                    {!order.viewedAt && (
                      <span
                        style={{
                          marginLeft: ".4rem",
                          fontFamily: "Inter, sans-serif",
                          fontSize: ".62rem",
                          fontWeight: 700,
                          color: "var(--purple)",
                        }}
                      >
                        NOVO
                      </span>
                    )}
                    {order.channel !== "site" && (
                      <div style={{ marginTop: ".2rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            fontFamily: "Inter, sans-serif",
                            fontSize: ".68rem",
                            color: "var(--text-muted)",
                            background: "var(--bg3)",
                            border: "1px solid var(--border)",
                            borderRadius: "999px",
                            padding: ".1rem .5rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {channelBadgeText(order)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td style={{ fontFamily: "Orbitron, monospace", fontSize: ".8rem", whiteSpace: "nowrap" }}>
                    {order.marketplaceOrderNumber ?? "—"}
                  </td>
                  <td>
                    {order.customerName}
                    <br />
                    <small style={{ color: "var(--text-muted)" }}>
                      {order.customerEmail ?? order.customerPhone ?? "—"}
                    </small>
                  </td>
                  <td style={{ fontSize: ".82rem", color: "var(--text-muted)", maxWidth: "220px" }}>
                    <div
                      title={order.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {order.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
                    </div>
                  </td>
                  <td>
                    <strong>R$ {order.total.toFixed(2)}</strong>
                  </td>
                  <td style={{ fontSize: ".82rem" }}>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      style={{
                        background: "var(--bg3)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        padding: ".3rem .6rem",
                        borderRadius: "6px",
                        fontSize: ".78rem",
                      }}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {ORDER_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="action-btn"
                      onClick={() => {
                        setViewOrder(order);
                        if (!order.viewedAt) markOrderViewed.mutate(order.id);
                      }}
                    >
                      👁 Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title={`Pedido ${viewOrder?.orderNumber ?? ""}`}
        size="lg"
      >
        {viewOrder &&
          (() => {
            const revenue = viewOrder.items.reduce((sum, i) => sum + i.price * i.qty, 0);
            const cost = viewOrder.items.reduce((sum, i) => sum + (i.costPrice ?? 0) * i.qty, 0);
            const profit = revenue - cost;
            return (
              <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                rowGap: "1.1rem",
                columnGap: "1rem",
                marginBottom: "1.2rem",
              }}
            >
              <div>
                <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Cliente: </span>
                <span style={{ fontWeight: 600 }}>{viewOrder.customerName}</span>
              </div>
              <div>
                {viewOrder.customerEmail && (
                  <div>
                    <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Email: </span>
                    <span>{viewOrder.customerEmail}</span>
                  </div>
                )}
                {viewOrder.customerPhone && (
                  <div style={{ marginTop: viewOrder.customerEmail ? ".2rem" : 0 }}>
                    <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Telefone: </span>
                    <span>{viewOrder.customerPhone}</span>
                  </div>
                )}
                {!viewOrder.customerEmail && !viewOrder.customerPhone && (
                  <div>
                    <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Contato: </span>
                    <span>—</span>
                  </div>
                )}
              </div>
              <div>
                <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Data: </span>
                <span>{new Date(viewOrder.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
              <div>
                <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Pagamento: </span>
                <span style={{ textTransform: "uppercase" }}>{viewOrder.paymentMethod}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Status: </span>
                <StatusBadge status={viewOrder.status} />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem 1.2rem",
                marginBottom: "1.2rem",
              }}
            >
              <div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Total do pedido</div>
                <div style={{ fontFamily: "Orbitron, monospace", color: "var(--purple)", fontWeight: 700, fontSize: "1.25rem" }}>
                  R$ {viewOrder.total.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Lucro (itens do pedido)</div>
                <div style={{ color: profit >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 700, fontSize: "1.1rem" }}>
                  R$ {profit.toFixed(2)}
                  {revenue > 0 && (
                    <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: ".8rem" }}>
                      {" "}
                      ({((profit / revenue) * 100).toFixed(0)}% margem)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ background: "var(--bg3)", borderRadius: "8px", padding: "1rem", fontSize: ".88rem", color: "var(--text-muted)" }}>
              {viewOrder.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
            </div>

            {viewOrder.isManual && (
              <>
                <div className="section-divider" />
                <label style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>💰 Desconto (pedido manual)</label>
                <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: ".2rem" }}>
                  Aplicado atualmente: R$ {viewOrder.discount.toFixed(2)}
                  {viewOrder.discountType === "percent" && ` (${viewOrder.discountValue}%)`}
                </div>
                <div className="form-row" style={{ marginTop: ".4rem" }}>
                  <div className="form-group">
                    <label>Tipo</label>
                    <select
                      className="admin-select"
                      value={discountEdit.type}
                      onChange={(e) => setDiscountEdit({ ...discountEdit, type: e.target.value as DiscountType })}
                    >
                      {DISCOUNT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {DISCOUNT_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Desconto {discountEdit.type === "percent" ? "(%)" : "(R$)"}</label>
                    <input
                      className="admin-input"
                      type="number"
                      step="0.01"
                      min={0}
                      max={discountEdit.type === "percent" ? 100 : undefined}
                      value={discountEdit.value}
                      onChange={(e) => setDiscountEdit({ ...discountEdit, value: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  className="btn-outline"
                  style={{ width: "100%", marginTop: ".4rem" }}
                  onClick={handleSaveDiscount}
                  disabled={updateManualDiscount.isPending}
                >
                  💾 Salvar desconto
                </button>
              </>
            )}

            <div className="section-divider" />
            <div className="form-group">
              <label>🚚 Código de rastreio (Correios / transportadora)</label>
              <input
                className="admin-input"
                placeholder="Ex: AA123456789BR"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
              />
            </div>
            {viewOrder.trackingUrl && (
              <a href={viewOrder.trackingUrl} target="_blank" rel="noreferrer" style={{ fontSize: ".82rem", color: "var(--purple-light)" }}>
                Ver rastreamento →
              </a>
            )}
            <button
              className="btn-outline"
              style={{ width: "100%", marginTop: ".8rem" }}
              onClick={handleSaveTracking}
              disabled={updateTracking.isPending || !trackingInput.trim()}
            >
              💾 Salvar rastreio
            </button>

            <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={() => setViewOrder(null)}>
              Fechar
            </button>
              </>
            );
          })()}
      </Modal>

      <Modal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Novo Pedido Manual"
        size="lg"
      >
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem", marginBottom: "1.2rem" }}>
          Use para registrar pedidos combinados por WhatsApp ou outro canal fora do site.
        </p>

        <label style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>Cliente</label>
        <div className="form-row" style={{ marginTop: ".4rem" }}>
          <div className="form-group">
            <label>Nome *</label>
            <input
              className="admin-input"
              value={manualForm.customerName}
              onChange={(e) => setManualForm({ ...manualForm, customerName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Telefone / WhatsApp</label>
            <input
              className="admin-input"
              placeholder="(11) 99999-9999"
              value={manualForm.customerPhone}
              onChange={(e) => setManualForm({ ...manualForm, customerPhone: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label>E-mail (opcional se houver telefone)</label>
          <input
            className="admin-input"
            type="email"
            value={manualForm.customerEmail}
            onChange={(e) => setManualForm({ ...manualForm, customerEmail: e.target.value })}
          />
        </div>

        <div className="section-divider" />
        <label style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>Endereço de entrega</label>
        <div className="form-row" style={{ marginTop: ".4rem" }}>
          <div className="form-group">
            <label>CEP</label>
            <input
              className="admin-input"
              placeholder="00000-000"
              value={manualAddress.cep}
              onChange={(e) => setManualAddress({ ...manualAddress, cep: e.target.value })}
            />
            {manualCepStatus === "loading" && (
              <small style={{ color: "var(--text-muted)" }}>Buscando endereço...</small>
            )}
            {manualCepStatus === "error" && (
              <small style={{ color: "var(--danger)" }}>CEP não encontrado, preencha manualmente.</small>
            )}
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              className="admin-select"
              value={manualAddress.state}
              onChange={(e) => setManualAddress({ ...manualAddress, state: e.target.value })}
            >
              {BR_STATES.map((uf) => (
                <option key={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Cidade</label>
            <input
              className="admin-input"
              value={manualAddress.city}
              onChange={(e) => setManualAddress({ ...manualAddress, city: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Bairro</label>
            <input
              className="admin-input"
              value={manualAddress.neighborhood}
              onChange={(e) => setManualAddress({ ...manualAddress, neighborhood: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Endereço</label>
            <input
              className="admin-input"
              value={manualAddress.street}
              onChange={(e) => setManualAddress({ ...manualAddress, street: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Número</label>
            <input
              className="admin-input"
              value={manualAddress.number}
              onChange={(e) => setManualAddress({ ...manualAddress, number: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Complemento (opcional)</label>
          <input
            className="admin-input"
            value={manualAddress.complement}
            onChange={(e) => setManualAddress({ ...manualAddress, complement: e.target.value })}
          />
        </div>

        <div className="section-divider" />
        <label style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>Itens do pedido</label>
        {manualItems.map((item, i) => {
          const product = products.find((p) => p.id === item.productId);
          return (
            <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginTop: ".5rem", alignItems: "center" }}>
              <select
                className="admin-select"
                style={{ flex: "2 1 220px", minWidth: 0 }}
                value={item.productId}
                onChange={(e) => handleManualProductChange(i, e.target.value)}
              >
                <option value="">Produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · R$ {p.price.toFixed(2)}
                  </option>
                ))}
              </select>
              <input
                className="admin-input"
                style={{ flex: "0 1 70px", minWidth: 0 }}
                type="number"
                min={1}
                placeholder="Qtd"
                value={item.qty}
                onChange={(e) => updateManualItem(i, { qty: e.target.value })}
              />
              {product && product.colors.length > 0 ? (
                <select
                  className="admin-select"
                  style={{ flex: "1 1 130px", minWidth: 0 }}
                  value={item.color}
                  onChange={(e) => updateManualItem(i, { color: e.target.value })}
                >
                  {product.colors.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="admin-input"
                  style={{ flex: "1 1 130px", minWidth: 0 }}
                  placeholder="Cor"
                  value={item.color}
                  onChange={(e) => updateManualItem(i, { color: e.target.value })}
                />
              )}
              <input
                className="admin-input"
                style={{ flex: "1 1 130px", minWidth: 0 }}
                placeholder="Material"
                value={item.material}
                onChange={(e) => updateManualItem(i, { material: e.target.value })}
              />
              <button
                className="action-btn danger"
                onClick={() => removeManualItemRow(i)}
                disabled={manualItems.length === 1}
              >
                🗑
              </button>
            </div>
          );
        })}
        <button className="action-btn" style={{ marginTop: ".6rem" }} onClick={addManualItemRow}>
          + Adicionar item
        </button>

        <div className="section-divider" />
        <div className="form-row">
          <div className="form-group">
            <label>Frete</label>
            <select
              className="admin-select"
              value={manualForm.shippingMethod}
              onChange={(e) => setManualForm({ ...manualForm, shippingMethod: e.target.value as ShippingMethod })}
            >
              {MANUAL_ORDER_SHIPPING_METHODS.map((method) => (
                <option key={method} value={method}>
                  {SHIPPING_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Valor do frete (R$)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              min={0}
              disabled={manualForm.shippingMethod === "pickup"}
              value={manualForm.shippingCost}
              onChange={(e) => setManualForm({ ...manualForm, shippingCost: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Tipo de desconto</label>
            <select
              className="admin-select"
              value={manualForm.discountType}
              onChange={(e) => setManualForm({ ...manualForm, discountType: e.target.value as DiscountType })}
            >
              {DISCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DISCOUNT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Desconto {manualForm.discountType === "percent" ? "(%)" : "(R$)"}</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              min={0}
              max={manualForm.discountType === "percent" ? 100 : undefined}
              value={manualForm.discountValue}
              onChange={(e) => setManualForm({ ...manualForm, discountValue: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Forma de pagamento</label>
            <select
              className="admin-select"
              value={manualForm.paymentMethod}
              onChange={(e) => setManualForm({ ...manualForm, paymentMethod: e.target.value as PaymentMethod })}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status do pagamento</label>
            <select
              className="admin-select"
              value={manualForm.paymentStatus}
              onChange={(e) => setManualForm({ ...manualForm, paymentStatus: e.target.value as PaymentStatus })}
            >
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PAYMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Status do pedido</label>
            <select
              className="admin-select"
              value={manualForm.status}
              onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as OrderStatus })}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
            fontSize: "1.05rem",
            marginTop: ".8rem",
            paddingTop: ".8rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          <span>Total</span>
          <span style={{ fontFamily: "Orbitron, monospace", color: "var(--purple)" }}>
            R$ {manualTotal.toFixed(2)}
          </span>
        </div>

        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: "1rem" }}
          onClick={handleCreateManualOrder}
          disabled={createManualOrder.isPending}
        >
          💾 Criar Pedido
        </button>
      </Modal>
    </div>
  );
}
