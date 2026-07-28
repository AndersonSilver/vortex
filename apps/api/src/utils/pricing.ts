import type { Coupon } from "../entities/Coupon";

export interface CartLine {
  price: number;
  qty: number;
}

export function calculateSubtotal(items: CartLine[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function isCouponUsable(coupon: Coupon, subtotal: number): { ok: true } | { ok: false; reason: string } {
  if (!coupon.active) {
    return { ok: false, reason: "Cupom inativo." };
  }
  if (new Date(coupon.expiresAt) < new Date()) {
    return { ok: false, reason: "Cupom expirado." };
  }
  if (coupon.uses >= coupon.maxUses) {
    return { ok: false, reason: "Cupom esgotado." };
  }
  if (subtotal < Number(coupon.minOrder)) {
    return { ok: false, reason: `Pedido mínimo de R$ ${Number(coupon.minOrder).toFixed(2)}.` };
  }
  return { ok: true };
}

export function calculateDiscount(coupon: Coupon, subtotal: number, shippingCost: number): number {
  switch (coupon.type) {
    case "percent":
      return subtotal * (Number(coupon.value) / 100);
    case "fixed":
      return Math.min(Number(coupon.value), subtotal);
    case "free_shipping":
      return shippingCost;
    default:
      return 0;
  }
}

export interface PaymentMethodAdjustment {
  pixDiscountPercent: number;
  boletoDiscountPercent: number;
}

export function applyPaymentMethodDiscount(
  amount: number,
  method: "pix" | "card" | "boleto",
  settings: PaymentMethodAdjustment,
): number {
  if (method === "pix") {
    return amount * (1 - settings.pixDiscountPercent / 100);
  }
  if (method === "boleto") {
    return amount * (1 - settings.boletoDiscountPercent / 100);
  }
  return amount;
}
