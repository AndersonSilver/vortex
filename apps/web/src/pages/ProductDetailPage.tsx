import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ShippingMethod } from "@vortex/shared";
import { useProduct, useProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { useCategoryLabel } from "../hooks/useProductCategories";
import { useAddToCart } from "../hooks/useCart";
import { useShippingQuote } from "../hooks/useShipping";
import { useToast } from "../components/Toast";
import { useAuthStore } from "../state/auth-store";
import { extractErrorMessage } from "../lib/api-client";
import { fetchAddressByCep, type CepLookupResult } from "../lib/cep";

const SHIPPING_LABELS: Record<ShippingMethod, { icon: string; title: string }> = {
  pac: { icon: "📦", title: "PAC" },
  sedex: { icon: "⚡", title: "SEDEX" },
  pickup: { icon: "🏠", title: "Retirada no local" },
  bling: { icon: "🧾", title: "Loja de origem (Bling)" },
};

function estimatedArrivalLabel(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(slug);
  const { data: allProducts = [] } = useProducts();
  const addToCart = useAddToCart();
  const shippingQuote = useShippingQuote();
  const { showToast } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);
  const categoryLabel = useCategoryLabel();

  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [cep, setCep] = useState("");
  const [cepAddress, setCepAddress] = useState<CepLookupResult | null>(null);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error">("idle");
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingMethod | null>(null);
  const [activeMedia, setActiveMedia] = useState(0);

  useEffect(() => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepStatus("idle");
      setCepAddress(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCepStatus("loading");
      try {
        const result = await fetchAddressByCep(digits, controller.signal);
        if (!result) {
          setCepStatus("error");
          setCepAddress(null);
          return;
        }
        setCepStatus("idle");
        setCepAddress(result);
      } catch {
        if (!controller.signal.aborted) {
          setCepStatus("error");
          setCepAddress(null);
        }
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cep]);

  useEffect(() => {
    if (shippingQuote.data && shippingQuote.data.length > 0) {
      const cheapest = [...shippingQuote.data].sort((a, b) => a.price - b.price)[0];
      setSelectedShippingMethod(cheapest.method);
    }
  }, [shippingQuote.data]);

  if (isLoading) {
    return (
      <div className="product-detail">
        <div className="container">
          <p style={{ color: "var(--text-muted)" }}>Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail">
        <div className="container">
          <p style={{ color: "var(--text-muted)" }}>Produto não encontrado.</p>
        </div>
      </div>
    );
  }

  const selectedColor = color ?? product.colors[0];
  const shippingOptions = shippingQuote.data ? [...shippingQuote.data].sort((a, b) => a.price - b.price) : null;
  const deliveryOptions = shippingOptions?.filter((o) => o.method !== "pickup") ?? [];
  const cheapestShippingMethod = deliveryOptions.length > 1 ? deliveryOptions[0].method : null;
  const related = allProducts.filter((p) => p.id !== product.id).slice(0, 4);
  const gallery = product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const media = [
    ...gallery.map((url) => ({ type: "image" as const, url })),
    ...(product.videoUrl ? [{ type: "video" as const, url: product.videoUrl }] : []),
  ];
  const currentMedia = media[activeMedia] ?? media[0];

  function handleCheckShipping() {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      showToast("Informe um CEP válido.", "error");
      return;
    }
    shippingQuote.mutate(digits, {
      onError: (error) => showToast(extractErrorMessage(error, "Não foi possível calcular o frete."), "error"),
    });
  }

  function handleAddToCart() {
    if (!accessToken) {
      showToast("Entre na sua conta para adicionar ao carrinho.", "info");
      navigate("/entrar");
      return;
    }
    addToCart.mutate(
      { productId: product!.id, qty, color: selectedColor, material: product!.material },
      {
        onSuccess: () => showToast(`${product!.name} adicionado ao carrinho!`, "success"),
        onError: () => showToast("Não foi possível adicionar ao carrinho.", "error"),
      },
    );
  }

  return (
    <div className="product-detail">
      <div className="container">
        <button className="back-link" onClick={() => navigate("/")}>
          ← Voltar ao catálogo
        </button>
        <div className="detail-grid">
          <div className="detail-media">
            {media.length > 1 && (
              <div className="detail-thumbs">
                {media.map((item, index) => (
                  <button
                    key={item.url + index}
                    className={`thumb-btn${index === activeMedia ? " active" : ""}`}
                    onClick={() => setActiveMedia(index)}
                  >
                    {item.type === "video" ? (
                      <>
                        <video src={item.url} muted preload="metadata" />
                        <span className="thumb-play">▶</span>
                      </>
                    ) : (
                      <img src={item.url} alt={`${product.name} ${index + 1}`} />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="detail-img">
              {currentMedia ? (
                currentMedia.type === "video" ? (
                  <video key={currentMedia.url} src={currentMedia.url} controls style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "inherit" }} />
                ) : (
                  <img
                    key={currentMedia.url}
                    src={currentMedia.url}
                    alt={product.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                  />
                )
              ) : (
                product.emoji
              )}
            </div>
          </div>
          <div className="detail-info">
            <div className="product-cat">{categoryLabel(product.category)}</div>
            <h1>{product.name}</h1>
            <div className="detail-rating">
              <span className="stars">
                {"★".repeat(Math.floor(product.rating))}
                {"☆".repeat(5 - Math.floor(product.rating))}
              </span>
              <span>
                {product.rating} ({product.reviewsCount} avaliações)
              </span>
            </div>
            <div className="detail-price">
              R$ {product.price.toFixed(2)} {product.oldPrice && <span>R$ {product.oldPrice.toFixed(2)}</span>}
            </div>
            <p className="detail-desc">{product.description}</p>
            <div className="detail-options">
              <label>Cor</label>
              <div className="option-group">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    className={`option-btn${c === selectedColor ? " active" : ""}`}
                    onClick={() => setColor(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="qty-row">
              <div className="qty-ctrl">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)}>+</button>
              </div>
              <span style={{ fontSize: ".85rem", color: "var(--success)" }}>✓ Em estoque</span>
            </div>
            <div className="form-group">
              <label>📍 Calcular frete</label>
              <div style={{ display: "flex", gap: ".6rem" }}>
                <input
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  onKeyDown={(e) => e.key === "Enter" && handleCheckShipping()}
                />
                <button
                  className="btn-outline"
                  style={{ whiteSpace: "nowrap" }}
                  onClick={handleCheckShipping}
                  disabled={shippingQuote.isPending}
                >
                  {shippingQuote.isPending ? "Calculando..." : "Calcular"}
                </button>
              </div>
              {cepStatus === "loading" && <p className="cep-hint">Buscando endereço...</p>}
              {cepStatus === "error" && <p className="cep-hint cep-hint-error">CEP não encontrado.</p>}
              {cepAddress && cepStatus === "idle" && (
                <p className="cep-hint">
                  {cepAddress.street ? `${cepAddress.street}, ` : ""}
                  {cepAddress.neighborhood} — {cepAddress.city}/{cepAddress.state}
                </p>
              )}
              {shippingOptions && (
                <div className="shipping-options">
                  {shippingOptions.map((option) => {
                    const isSelected = selectedShippingMethod === option.method;
                    const isCheapest = cheapestShippingMethod === option.method;
                    return (
                      <button
                        key={option.method}
                        type="button"
                        className={`shipping-option${isSelected ? " active" : ""}`}
                        onClick={() => setSelectedShippingMethod(option.method)}
                      >
                        <span className="shipping-option-radio" />
                        <span className="shipping-option-icon">{SHIPPING_LABELS[option.method].icon}</span>
                        <span className="shipping-option-info">
                          <span className="shipping-option-title">
                            {SHIPPING_LABELS[option.method].title}
                            {isCheapest && <span className="shipping-badge">Mais barato</span>}
                          </span>
                          <span className="shipping-option-meta">
                            Chega até {estimatedArrivalLabel(option.estimatedDays)} · {option.estimatedDays}{" "}
                            {option.estimatedDays === 1 ? "dia útil" : "dias úteis"}
                          </span>
                        </span>
                        <span className="shipping-option-price">
                          {option.price === 0 ? "Grátis" : `R$ ${option.price.toFixed(2)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="detail-actions">
              <button className="btn-add-cart" onClick={handleAddToCart} disabled={addToCart.isPending}>
                🛒 Adicionar ao Carrinho
              </button>
            </div>
            <div className="detail-specs" style={{ marginTop: "1.5rem" }}>
              <div style={{ fontSize: ".85rem", fontWeight: 700, marginBottom: ".8rem" }}>Especificações</div>
              {Object.entries(product.specs).map(([k, v]) => (
                <div className="spec-row" key={k}>
                  <span>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <div
              style={{
                background: "rgba(0,232,150,.08)",
                border: "1px solid rgba(0,232,150,.2)",
                borderRadius: "10px",
                padding: "1rem",
                marginTop: "1rem",
                fontSize: ".85rem",
              }}
            >
              <span style={{ color: "var(--success)" }}>🛡️</span> <strong>Garantia Vórtex:</strong> se a peça chegar
              danificada, reimprimimos sem custo.
            </div>
          </div>
        </div>
        {related.length > 0 && (
          <div className="cart-recommendations">
            <div className="cart-recommendations-title">
              <span className="section-tag">Continue explorando</span>
              <h2>Você também pode gostar</h2>
            </div>
            <div className="product-grid">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
