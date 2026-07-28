import { z } from "zod";
import {
  COUPON_TYPES,
  PAYMENT_METHODS,
  PRODUCT_BADGES,
  PRODUCT_CATEGORIES,
  SHIPPING_METHODS,
} from "./enums";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  cpf: z.string().min(11).max(14).optional(),
  phone: z.string().min(8).max(20).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const addressSchema = z.object({
  label: z.string().min(1).max(60).default("Principal"),
  cep: z.string().min(8).max(9),
  state: z.string().length(2),
  city: z.string().min(1).max(120),
  neighborhood: z.string().min(1).max(120),
  street: z.string().min(1).max(200),
  number: z.string().min(1).max(20),
  complement: z.string().max(200).optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const productSchema = z.object({
  name: z.string().min(2).max(160),
  category: z.enum(PRODUCT_CATEGORIES),
  description: z.string().min(1),
  price: z.number().positive(),
  oldPrice: z.number().positive().nullable().optional(),
  emoji: z.string().min(1).max(8).default("📦"),
  imageUrl: z.string().url().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  badge: z.enum(PRODUCT_BADGES).nullable().optional(),
  colors: z.array(z.string()).default([]),
  material: z.string().min(1),
  specs: z.record(z.string(), z.string()).default({}),
  stock: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productSchema>;

export const cartAddItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().positive().default(1),
  color: z.string().min(1),
  material: z.string().min(1),
});
export type CartAddItemInput = z.infer<typeof cartAddItemSchema>;

export const cartUpdateItemSchema = z.object({
  qty: z.number().int().positive(),
});
export type CartUpdateItemInput = z.infer<typeof cartUpdateItemSchema>;

export const couponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(40)
    .transform((v) => v.toUpperCase().trim()),
  type: z.enum(COUPON_TYPES),
  value: z.number().min(0),
  minOrder: z.number().min(0).default(0),
  maxUses: z.number().int().positive().default(100),
  expiresAt: z.string().min(1),
  active: z.boolean().default(true),
});
export type CouponInput = z.infer<typeof couponSchema>;

export const applyCouponSchema = z.object({
  code: z.string().min(1),
});
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;

export const shippingQuoteSchema = z.object({
  cepDestino: z.string().min(8).max(9),
});
export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;

export const createOrderSchema = z.object({
  addressId: z.string().uuid(),
  shippingMethod: z.enum(SHIPPING_METHODS),
  paymentMethod: z.enum(PAYMENT_METHODS),
  couponCode: z.string().optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const customQuoteSchema = z.object({
  material: z.string().min(1),
  color: z.string().min(1),
  qty: z.number().int().positive().default(1),
  notes: z.string().max(2000).optional(),
  email: z.string().email(),
});
export type CustomQuoteInput = z.infer<typeof customQuoteSchema>;

export const storeSettingsSchema = z.object({
  storeName: z.string().min(1),
  storeEmail: z.string().email(),
  storePhone: z.string().min(1),
  storeCnpj: z.string().min(1),
  freeShippingThreshold: z.number().min(0),
  pixDiscountPercent: z.number().min(0).max(100),
  boletoDiscountPercent: z.number().min(0).max(100),
  installmentsWithoutInterest: z.number().int().min(1).max(24),
  pixKey: z.string().min(1),
  notifyNewOrder: z.boolean(),
  notifyPaymentConfirmed: z.boolean(),
  notifyLowStock: z.boolean(),
});
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;

export const createPaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  cardToken: z.string().optional(),
  installments: z.number().int().positive().optional(),
  paymentMethodId: z.string().optional(),
  issuerId: z.string().optional(),
  payerCpf: z.string().min(11).max(14).optional(),
  payerFirstName: z.string().optional(),
  payerLastName: z.string().optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "printing", "shipped", "delivered", "cancelled"]),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const updateOrderTrackingSchema = z.object({
  trackingCode: z.string().min(1),
  trackingUrl: z.string().url().optional(),
});
export type UpdateOrderTrackingInput = z.infer<typeof updateOrderTrackingSchema>;
