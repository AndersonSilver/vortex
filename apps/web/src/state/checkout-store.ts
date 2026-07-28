import { create } from "zustand";
import type { PaymentMethod, ShippingMethod } from "@vortex/shared";
import type { ApplyCouponResult } from "../hooks/useCoupons";

interface CheckoutState {
  couponResult: ApplyCouponResult | null;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  setCoupon: (result: ApplyCouponResult | null) => void;
  setShippingMethod: (method: ShippingMethod) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  reset: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  couponResult: null,
  shippingMethod: "pac",
  paymentMethod: "pix",
  setCoupon: (couponResult) => set({ couponResult }),
  setShippingMethod: (shippingMethod) => set({ shippingMethod }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  reset: () => set({ couponResult: null, shippingMethod: "pac", paymentMethod: "pix" }),
}));
