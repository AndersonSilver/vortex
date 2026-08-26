import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AddressDTO, ShippingMethod } from "@vortex/shared";
import { useCart } from "../hooks/useCart";
import { useAddresses, useCreateAddress, useUpdateAddress } from "../hooks/useAddresses";
import { useShippingQuote } from "../hooks/useShipping";
import { useCreateOrder } from "../hooks/useOrders";
import { OrderSummary } from "../components/OrderSummary";
import { useCheckoutStore } from "../state/checkout-store";
import { useToast } from "../components/Toast";
import { extractErrorMessage } from "../lib/api-client";
import { fetchAddressByCep } from "../lib/cep";
import { BR_STATES } from "../lib/br-states";

const SHIPPING_LABELS: Record<ShippingMethod, { icon: string; title: string }> = {
  pac: { icon: "📦", title: "PAC" },
  sedex: { icon: "⚡", title: "SEDEX" },
  pickup: { icon: "🏠", title: "Retirada no local" },
  bling: { icon: "🧾", title: "Loja de origem (Bling)" },
};

const PAYMENT_LABELS = {
  pix: { icon: "🔐", title: "PIX", hint: "5% off" },
  card: { icon: "💳", title: "Cartão", hint: "até 12x" },
};

const EMPTY_ADDRESS_FORM = {
  label: "Principal",
  cep: "",
  state: "SP",
  city: "",
  neighborhood: "",
  street: "",
  number: "",
  complement: "",
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const { data: cartItems = [] } = useCart();
  const { data: addresses = [], isSuccess: addressesLoaded } = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const shippingQuote = useShippingQuote();
  const createOrder = useCreateOrder();
  const { shippingMethod, setShippingMethod, paymentMethod, setPaymentMethod, couponResult, reset } =
    useCheckoutStore();
  const { showToast } = useToast();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_ADDRESS_FORM);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCepStatus("loading");
      try {
        const result = await fetchAddressByCep(digits, controller.signal);
        if (!result) {
          setCepStatus("error");
          return;
        }
        setCepStatus("idle");
        setForm((current) => ({
          ...current,
          state: result.state,
          city: result.city,
          neighborhood: result.neighborhood,
          street: result.street,
        }));
      } catch {
        if (!controller.signal.aborted) setCepStatus("error");
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cep]);

  useEffect(() => {
    if (!addressesLoaded) return;
    if (addresses.length > 0) {
      setSelectedAddressId((current) => current ?? addresses[0].id);
    } else {
      setShowNewAddressForm(true);
    }
  }, [addresses, addressesLoaded]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  useEffect(() => {
    if (selectedAddress?.cep) {
      shippingQuote.mutate(selectedAddress.cep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?.cep]);

  const quoteOptions = shippingQuote.data ?? [];
  const currentOption = quoteOptions.find((o) => o.method === shippingMethod);

  function resetAddressForm() {
    setShowNewAddressForm(false);
    setEditingAddressId(null);
    setForm(EMPTY_ADDRESS_FORM);
    setCepStatus("idle");
  }

  function openNewAddressForm() {
    setForm(EMPTY_ADDRESS_FORM);
    setEditingAddressId(null);
    setShowNewAddressForm(true);
    setCepStatus("idle");
  }

  function handleEditAddress(address: AddressDTO) {
    setForm({
      label: address.label,
      cep: address.cep,
      state: address.state,
      city: address.city,
      neighborhood: address.neighborhood,
      street: address.street,
      number: address.number,
      complement: address.complement ?? "",
    });
    setEditingAddressId(address.id);
    setShowNewAddressForm(true);
  }

  async function handleSaveAddress() {
    if (!form.cep || !form.city || !form.neighborhood || !form.street || !form.number) {
      showToast("Preencha todos os campos obrigatórios do endereço.", "error");
      return;
    }
    const onSuccess = (address: AddressDTO) => {
      setSelectedAddressId(address.id);
      resetAddressForm();
      showToast("Endereço salvo!", "success");
    };
    const onError = (error: unknown) =>
      showToast(extractErrorMessage(error, "Não foi possível salvar o endereço."), "error");

    if (editingAddressId) {
      updateAddress.mutate({ id: editingAddressId, ...form }, { onSuccess, onError });
    } else {
      createAddress.mutate(form, { onSuccess, onError });
    }
  }

  function handlePlaceOrder() {
    if (!selectedAddressId) {
      showToast("Selecione ou cadastre um endereço de entrega.", "error");
      return;
    }
    createOrder.mutate(
      {
        addressId: selectedAddressId,
        shippingMethod,
        paymentMethod,
        couponCode: couponResult?.coupon.code,
      },
      {
        onSuccess: (order) => {
          reset();
          navigate(`/pedido/${order.id}/pagamento`);
        },
        onError: () => showToast("Não foi possível finalizar o pedido.", "error"),
      },
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="container">
          <p style={{ color: "var(--text-muted)" }}>Seu carrinho está vazio.</p>
          <button className="btn-primary" style={{ marginTop: "1rem" }} onClick={() => navigate("/")}>
            Ver produtos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <button className="back-link" onClick={() => navigate("/carrinho")}>
          ← Voltar ao carrinho
        </button>
        <div className="checkout-header">
          <h1 className="cart-title">Finalizar Compra</h1>
          <div className="checkout-steps">
            <span className="checkout-step done">
              <span className="checkout-step-dot">✓</span> Carrinho
            </span>
            <span className="checkout-step-sep" />
            <span className="checkout-step active">
              <span className="checkout-step-dot">2</span> Entrega
            </span>
            <span className="checkout-step-sep" />
            <span className="checkout-step">
              <span className="checkout-step-dot">3</span> Confirmação
            </span>
          </div>
        </div>
        <div className="checkout-layout">
          <div>
            <div className="checkout-form" style={{ marginBottom: "1.2rem" }}>
              <h2>
                <span className="checkout-form-step">1</span> 📦 Endereço de Entrega
              </h2>
              {addresses.length > 0 && !showNewAddressForm && (
                <div className="payment-methods" style={{ gridTemplateColumns: "1fr", gap: ".6rem" }}>
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`pay-method address-option${selectedAddressId === address.id ? " active" : ""}`}
                      style={{ textAlign: "left" }}
                      onClick={() => setSelectedAddressId(address.id)}
                    >
                      <span className="pay-method-label">
                        {address.street}, {address.number}
                        {address.complement ? ` — ${address.complement}` : ""} — {address.neighborhood},{" "}
                        {address.city}/{address.state} · {address.cep}
                      </span>
                      <button
                        className="btn-edit-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAddress(address);
                        }}
                        aria-label="Editar endereço"
                        title="Editar endereço"
                      >
                        ✎
                      </button>
                    </div>
                  ))}
                  <button className="btn-outline" onClick={openNewAddressForm}>
                    + Novo endereço
                  </button>
                </div>
              )}
              {showNewAddressForm && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>CEP</label>
                      <input
                        placeholder="00000-000"
                        value={form.cep}
                        onChange={(e) => setForm({ ...form, cep: e.target.value })}
                      />
                      {cepStatus === "loading" && (
                        <small style={{ color: "var(--text-muted)" }}>Buscando endereço...</small>
                      )}
                      {cepStatus === "error" && (
                        <small style={{ color: "var(--danger)" }}>
                          CEP não encontrado, preencha o endereço manualmente.
                        </small>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Estado</label>
                      <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
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
                        placeholder="São Paulo"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Bairro</label>
                      <input
                        placeholder="Centro"
                        value={form.neighborhood}
                        onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Endereço</label>
                      <input
                        placeholder="Rua das Impressoras"
                        value={form.street}
                        onChange={(e) => setForm({ ...form, street: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Número</label>
                      <input
                        placeholder="42"
                        value={form.number}
                        onChange={(e) => setForm({ ...form, number: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Complemento (opcional)</label>
                    <input
                      placeholder="Apto, bloco, referência..."
                      value={form.complement}
                      onChange={(e) => setForm({ ...form, complement: e.target.value })}
                    />
                  </div>
                  <button
                    className="btn-outline"
                    onClick={handleSaveAddress}
                    disabled={createAddress.isPending || updateAddress.isPending}
                  >
                    {editingAddressId ? "Salvar alterações" : "Salvar endereço"}
                  </button>
                  {addresses.length > 0 && (
                    <button className="btn-outline" style={{ marginLeft: ".6rem" }} onClick={resetAddressForm}>
                      Cancelar
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="checkout-form" style={{ marginBottom: "1.2rem" }}>
              <h2>
                <span className="checkout-form-step">2</span> 🚚 Frete
              </h2>
              <div className="option-group">
                {(["pac", "sedex", "pickup"] as ShippingMethod[]).map((method) => {
                  const option = quoteOptions.find((o) => o.method === method);
                  return (
                    <label key={method} style={{ flex: 1, cursor: "pointer" }}>
                      <div
                        className={`pay-method${shippingMethod === method ? " active" : ""}`}
                        onClick={() => setShippingMethod(method)}
                      >
                        <span className="pay-method-icon">{SHIPPING_LABELS[method].icon}</span>
                        <span className="pay-method-label">
                          {SHIPPING_LABELS[method].title}
                          <br />
                          <small>
                            {option
                              ? option.price === 0
                                ? "Grátis"
                                : `R$ ${option.price.toFixed(2)} · ${option.estimatedDays}d`
                              : "—"}
                          </small>
                          {option && method !== "pickup" && (
                            <>
                              <br />
                              <small style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                                via {option.carrier}
                              </small>
                            </>
                          )}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="checkout-form">
              <h2>
                <span className="checkout-form-step">3</span> 💳 Pagamento
              </h2>
              <div className="payment-methods" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                {(Object.keys(PAYMENT_LABELS) as Array<keyof typeof PAYMENT_LABELS>).map((method) => (
                  <div
                    key={method}
                    className={`pay-method${paymentMethod === method ? " active" : ""}`}
                    onClick={() => setPaymentMethod(method)}
                  >
                    <span className="pay-method-icon">{PAYMENT_LABELS[method].icon}</span>
                    <span className="pay-method-label">
                      {PAYMENT_LABELS[method].title}
                      <br />
                      <small style={{ color: method !== "card" ? "var(--success)" : undefined }}>
                        {PAYMENT_LABELS[method].hint}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>
                O pagamento é concluído na próxima etapa, com PIX (QR Code) ou cartão via Mercado Pago.
              </p>
              <button
                className="btn-place-order"
                onClick={handlePlaceOrder}
                disabled={createOrder.isPending || !selectedAddressId}
              >
                ✅ Confirmar Pedido
              </button>
            </div>
          </div>
          <div>
            <OrderSummary
              items={cartItems}
              shippingCost={currentOption?.price}
              shippingLabel={SHIPPING_LABELS[shippingMethod].title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
