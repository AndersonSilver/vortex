import { useNavigate } from "react-router-dom";
import { useCart, useRemoveCartItem, useUpdateCartItem } from "../hooks/useCart";
import { useProducts } from "../hooks/useProducts";
import { OrderSummary } from "../components/OrderSummary";
import { ProductCard } from "../components/ProductCard";

export function CartPage() {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useCart();
  const { data: allProducts = [] } = useProducts();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const cartProductIds = new Set(items.map((item) => item.product.id));
  const recommended = allProducts.filter((product) => !cartProductIds.has(product.id)).slice(0, 4);

  if (isLoading) {
    return (
      <div className="cart-page">
        <div className="container">
          <p style={{ color: "var(--text-muted)" }}>Carregando carrinho...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <button className="back-link" onClick={() => navigate("/")}>
          ← Continuar comprando
        </button>
        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h2 style={{ fontFamily: "Orbitron, monospace", marginBottom: ".8rem" }}>Carrinho vazio</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Explore nosso catálogo e encontre algo incrível.
            </p>
            <button className="btn-primary" onClick={() => navigate("/")}>
              Ver produtos
            </button>
          </div>
        ) : (
          <div className="cart-layout">
            <div>
              <div className="cart-title-row">
                <h1 className="cart-title">Seu Carrinho</h1>
                <span className="cart-count">
                  {items.length} {items.length === 1 ? "item" : "itens"}
                </span>
              </div>
              <div>
                {items.map((item, index) => (
                  <div className="cart-item" key={item.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="cart-item-img">
                      {item.product.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} />
                      ) : (
                        item.product.emoji
                      )}
                    </div>
                    <div className="cart-item-info">
                      <div className="cart-item-top">
                        <div className="cart-item-name">{item.product.name}</div>
                        <button
                          className="btn-remove-icon"
                          onClick={() => removeItem.mutate(item.id)}
                          aria-label="Remover item"
                          title="Remover item"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="cart-item-tags">
                        <span className="cart-tag">🎨 {item.color}</span>
                        <span className="cart-tag">🧵 {item.material}</span>
                      </div>
                      <div className="cart-item-footer">
                        <div className="qty-ctrl">
                          <button
                            onClick={() => updateItem.mutate({ id: item.id, qty: Math.max(1, item.qty - 1) })}
                          >
                            −
                          </button>
                          <span>{item.qty}</span>
                          <button onClick={() => updateItem.mutate({ id: item.id, qty: item.qty + 1 })}>+</button>
                        </div>
                        <div className="cart-item-price">
                          {item.product.oldPrice && (
                            <span className="cart-item-old-price">
                              R$ {(item.product.oldPrice * item.qty).toFixed(2)}
                            </span>
                          )}
                          R$ {(item.product.price * item.qty).toFixed(2)}
                          {item.qty > 1 && (
                            <span className="cart-item-unit-price"> (R$ {item.product.price.toFixed(2)}/un)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <OrderSummary
                items={items}
                checkoutAction={{ label: "Finalizar Compra →", onClick: () => navigate("/checkout") }}
              />
            </div>
          </div>
        )}
        {recommended.length > 0 && (
          <div className="cart-recommendations">
            <div className="cart-recommendations-title">
              <span className="section-tag">Continue explorando</span>
              <h2>Você também pode gostar</h2>
            </div>
            <div className="product-grid">
              {recommended.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
