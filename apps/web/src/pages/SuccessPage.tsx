import { Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useOrder } from "../hooks/useOrders";

const STEPS = [
  { key: "paid", icon: "✓", label: "Pago" },
  { key: "printing", icon: "🖨", label: "Imprimindo" },
  { key: "packed", icon: "📦", label: "Embalado" },
  { key: "shipped", icon: "🚚", label: "Enviado" },
  { key: "delivered", icon: "🏠", label: "Entregue" },
];

function stepIndexForStatus(status: string): number {
  switch (status) {
    case "pending":
      return 0;
    case "printing":
      return 1;
    case "shipped":
      return 3;
    case "delivered":
      return 4;
    default:
      return 0;
  }
}

export function SuccessPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { data: order } = useOrder(orderId);

  const activeIndex = order ? stepIndexForStatus(order.status) : 0;

  return (
    <div className="success-page">
      <div className="success-box">
        <div className="success-icon">🎉</div>
        <h1>Pedido Confirmado!</h1>
        <p>Obrigado pela sua compra. Você receberá um e-mail em instantes.</p>
        <div className="order-num">#{order?.orderNumber ?? "..."}</div>
        <div className="track-steps">
          {STEPS.map((step, i) => (
            <Fragment key={step.key}>
              <div className={`track-step${i < activeIndex ? " done" : i === activeIndex ? " active" : ""}`}>
                <div className="track-step-dot">{step.icon}</div>
                <div className="track-step-label">{step.label}</div>
              </div>
              {i < STEPS.length - 1 && <div className={`track-line${i < activeIndex ? " done" : ""}`} />}
            </Fragment>
          ))}
        </div>
        {order?.trackingCode && (
          <p style={{ marginBottom: "1.5rem" }}>
            Código de rastreio:{" "}
            {order.trackingUrl ? (
              <a href={order.trackingUrl} target="_blank" rel="noreferrer" style={{ color: "var(--purple-light)" }}>
                {order.trackingCode}
              </a>
            ) : (
              order.trackingCode
            )}
          </p>
        )}
        <button className="btn-primary" style={{ marginRight: ".8rem" }} onClick={() => navigate("/")}>
          Continuar comprando
        </button>
        <button className="btn-outline" onClick={() => navigate("/conta")}>
          Ver Meus Pedidos
        </button>
      </div>
    </div>
  );
}
