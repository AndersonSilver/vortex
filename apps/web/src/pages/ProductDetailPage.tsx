import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ShippingMethod } from "@vortex/shared";
import { useProduct, useProducts } from "../hooks/useProducts";
import { ProductCard, categoryLabel } from "../components/ProductCard";
import { useAddToCart } from "../hooks/useCart";
import { useShippingQuote } from "../hooks/useShipping";
import { useToast } from "../components/Toast";
import { useAuthStore } from "../state/auth-store";
import { extractErrorMessage } from "../lib/api-client";

const SHIPPING_LABELS: Record<ShippingMethod, { icon: string; title: string }> = {
  pac: { icon: "📦", title: "PAC" },
  sedex: { icon: "⚡", title: "SEDEX" },
  pickup: { icon: "🏠", title: "Retirada no local" },
};

export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(slug);
  const { data: allProducts = [] } = useProducts();
  const addToCart = useAddToCart();
  const shippingQuote = useShippingQuote();
  const { showToast } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [cep, setCep] = useState("");

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
  const related = allProducts.filter((p) => p.id !== product.id).slice(0, 4);

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
          <div>
            <div className="detail-img">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                />
              ) : (
                product.emoji
              )}
            </div>
            {product.videoUrl && (
              <video
                src={product.videoUrl}
                controls
                style={{
                  width: "100%",
                  marginTop: "1rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                }}
              />
            )}
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
            <div className="detail-tags">
              <span className="tag">🧵 Material: {product.material}</span>
              <span className="tag">🚀 Entrega 24-48h</span>
              <span className="tag">🔄 Reimpressão garantida</span>
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
            <div className="form-group" style={{ maxWidth: "360px" }}>
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
              {shippingQuote.data && (
                <div style={{ display: "flex", gap: ".6rem", marginTop: ".6rem" }}>
                  {shippingQuote.data.map((option) => (
                    <div key={option.method} className="pay-method" style={{ flex: 1, cursor: "default" }}>
                      <span className="pay-method-icon">{SHIPPING_LABELS[option.method].icon}</span>
                      <span className="pay-method-label">
                        {SHIPPING_LABELS[option.method].title}
                        <br />
                        <small>
                          {option.price === 0 ? "Grátis" : `R$ ${option.price.toFixed(2)}`} · {option.estimatedDays}d
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="detail-actions">
              <button className="btn-add-cart" onClick={handleAddToCart} disabled={addToCart.isPending}>
                🛒 Adicionar ao Carrinho
              </button>
              <button className="btn-wishlist">♡</button>
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
