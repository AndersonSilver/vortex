import { useNavigate } from "react-router-dom";
import { useCart, useRemoveCartItem, useUpdateCartItem } from "../hooks/useCart";
import { OrderSummary } from "../components/OrderSummary";

export function CartPage() {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

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
              <h1 className="cart-title">Seu Carrinho</h1>
              <div>
                {items.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div className="cart-item-img">
                      {item.product.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} />
                      ) : (
                        item.product.emoji
                      )}
                    </div>
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.product.name}</div>
                      <div className="cart-item-meta">
                        Cor: {item.color} · Material: {item.material}
                      </div>
                      <div className="cart-item-price">
                        R$ {(item.product.price * item.qty).toFixed(2)}
                        {item.qty > 1 && (
                          <span className="cart-item-unit-price"> (R$ {item.product.price.toFixed(2)}/un)</span>
                        )}
                      </div>
                    </div>
                    <div className="cart-item-actions">
                      <button className="btn-remove" onClick={() => removeItem.mutate(item.id)}>
                        ✕ Remover
                      </button>
                      <div className="qty-ctrl">
                        <button
                          onClick={() => updateItem.mutate({ id: item.id, qty: Math.max(1, item.qty - 1) })}
                        >
                          −
                        </button>
                        <span>{item.qty}</span>
                        <button onClick={() => updateItem.mutate({ id: item.id, qty: item.qty + 1 })}>+</button>
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
      </div>
    </div>
  );
}
