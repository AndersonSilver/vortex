import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import { categoryLabel } from "../components/ProductCard";
import { useAddToCart } from "../hooks/useCart";
import { useToast } from "../components/Toast";
import { useAuthStore } from "../state/auth-store";

export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(slug);
  const addToCart = useAddToCart();
  const { showToast } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

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
      </div>
    </div>
  );
}
