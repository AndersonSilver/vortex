import { useState } from "react";
import type { CartItemDTO } from "@vortex/shared";
import { useApplyCoupon } from "../hooks/useCoupons";
import { useCheckoutStore } from "../state/checkout-store";
import { useToast } from "./Toast";

interface OrderSummaryProps {
  items: CartItemDTO[];
  shippingCost?: number;
  shippingLabel?: string;
  checkoutAction?: { label: string; onClick: () => void; disabled?: boolean };
}

export function OrderSummary({ items, shippingCost, shippingLabel, checkoutAction }: OrderSummaryProps) {
  const [code, setCode] = useState("");
  const applyCoupon = useApplyCoupon();
  const { couponResult, setCoupon } = useCheckoutStore();
  const { showToast } = useToast();

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const discount = couponResult && couponResult.coupon.type !== "free_shipping" ? couponResult.discount : 0;
  const freeShippingCoupon = couponResult?.coupon.type === "free_shipping";
  const effectiveShipping = freeShippingCoupon ? 0 : shippingCost ?? undefined;
  const total = Math.max(0, subtotal - discount + (effectiveShipping ?? 0));

  function handleApply() {
    if (!code.trim()) return;
    applyCoupon.mutate(code, {
      onSuccess: (result) => {
        setCoupon(result);
        showToast(
          `Cupom aplicado! ${
            result.coupon.type === "percent"
              ? result.coupon.value + "% off"
              : result.coupon.type === "fixed"
                ? `R$ ${result.coupon.value} off`
                : "Frete grátis"
          }`,
          "success",
        );
      },
      onError: () => showToast("Cupom inválido ou expirado.", "error"),
    });
  }

  return (
    <div className="order-summary">
      <h3>Resumo do Pedido</h3>
      {items.map((item) => (
        <div className="summary-row" key={item.id} style={{ fontSize: ".82rem" }}>
          <span>
            {item.product.name} x{item.qty}
          </span>
          <span>R$ {(item.product.price * item.qty).toFixed(2)}</span>
        </div>
      ))}
      <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: ".5rem 0" }} />
      <div className="summary-row">
        <span>Subtotal</span>
        <span>R$ {subtotal.toFixed(2)}</span>
      </div>
      <div className="summary-row">
        <span>Frete{shippingLabel ? ` (${shippingLabel})` : ""}</span>
        <span>
          {effectiveShipping === undefined ? (
            "Calculado no checkout"
          ) : effectiveShipping === 0 ? (
            <span style={{ color: "var(--success)" }}>Grátis</span>
          ) : (
            `R$ ${effectiveShipping.toFixed(2)}`
          )}
        </span>
      </div>
      {couponResult && (
        <div className="summary-row" style={{ color: "var(--success)" }}>
          <span>🎟️ {couponResult.coupon.code}</span>
          <span>{freeShippingCoupon ? "Frete grátis" : `− R$ ${discount.toFixed(2)}`}</span>
        </div>
      )}
      <div className="summary-row total">
        <span>Total</span>
        <span>R$ {total.toFixed(2)}</span>
      </div>
      <div style={{ marginTop: "1rem" }}>
        <div style={{ fontSize: ".78rem", color: "var(--text-muted)", marginBottom: ".4rem" }}>
          Cupom de desconto
        </div>
        <div className="coupon-input">
          <input
            placeholder="BEMVINDO10"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{ textTransform: "uppercase" }}
          />
          <button onClick={handleApply} disabled={applyCoupon.isPending}>
            Aplicar
          </button>
        </div>
      </div>
      {checkoutAction && (
        <button className="btn-checkout" onClick={checkoutAction.onClick} disabled={checkoutAction.disabled}>
          {checkoutAction.label}
        </button>
      )}
      <div className="payment-icons">
        <span>💳</span>
        <span>🔐</span>
        <span>📄</span>
      </div>
      <div style={{ textAlign: "center", fontSize: ".75rem", color: "var(--text-muted)", marginTop: ".5rem" }}>
        🔒 Compra 100% segura
      </div>
    </div>
  );
}
