import { useNavigate } from "react-router-dom";
import type { ProductDTO } from "@vortex/shared";
import { useAddToCart } from "../hooks/useCart";
import { useToast } from "./Toast";
import { useAuthStore } from "../state/auth-store";

const BADGE_LABEL: Record<string, string> = { hot: "🔥 Hot", new: "Novo", sale: "Sale" };

export function ProductCard({ product }: { product: ProductDTO }) {
  const navigate = useNavigate();
  const addToCart = useAddToCart();
  const { showToast } = useToast();
  const accessToken = useAuthStore((s) => s.accessToken);

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation();
    if (!accessToken) {
      showToast("Entre na sua conta para adicionar ao carrinho.", "info");
      navigate("/entrar");
      return;
    }
    addToCart.mutate(
      { productId: product.id, qty: 1, color: product.colors[0] ?? "Padrão", material: product.material },
      {
        onSuccess: () => showToast(`${product.name} adicionado ao carrinho!`, "success"),
        onError: () => showToast("Não foi possível adicionar ao carrinho.", "error"),
      },
    );
  }

  return (
    <div
      className="product-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/produtos/${product.slug}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(`/produtos/${product.slug}`);
      }}
    >
      <div className="product-img">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          product.emoji
        )}
        {product.badge && <div className={`badge badge-${product.badge}`}>{BADGE_LABEL[product.badge]}</div>}
      </div>
      <div className="product-info">
        <div className="product-cat">{categoryLabel(product.category)}</div>
        <div className="product-name">{product.name}</div>
        <div className="product-desc">{product.description.slice(0, 80)}...</div>
        <div className="product-footer">
          <div>
            <span className="product-price">R$ {product.price.toFixed(2)}</span>
            {product.oldPrice && <span className="product-price-old">R$ {product.oldPrice.toFixed(2)}</span>}
          </div>
          <button className="btn-cart" onClick={handleAddToCart} disabled={addToCart.isPending}>
            + Carrinho
          </button>
        </div>
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  figurines: "Miniaturas",
  industrial: "Industrial",
  decor: "Decoração",
  tech: "Tech",
  toys: "Brinquedos",
};

export function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}
