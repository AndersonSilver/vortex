import { z } from "zod";
import {
  COUPON_TYPES,
  FILAMENT_MATERIALS,
  FILAMENT_MOVEMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRINT_JOB_STATUSES,
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
  images: z.array(z.string().url()).max(5).default([]),
  videoUrl: z.string().url().nullable().optional(),
  badge: z.enum(PRODUCT_BADGES).nullable().optional(),
  colors: z.array(z.string()).default([]),
  material: z.string().min(1),
  specs: z.record(z.string(), z.string()).default({}),
  stock: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  filamentId: z.string().uuid().nullable().optional(),
  weightGrams: z.number().positive().nullable().optional(),
  printTimeMinutes: z.number().int().positive().nullable().optional(),
  costPrice: z.number().positive().nullable().optional(),
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

export const manualOrderItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().positive(),
  color: z.string().min(1),
  material: z.string().min(1),
});

export const createManualOrderSchema = z
  .object({
    customerName: z.string().min(1).max(160),
    customerEmail: z.string().email().optional(),
    customerPhone: z.string().min(8).max(20).optional(),
    address: addressSchema,
    items: z.array(manualOrderItemSchema).min(1),
    shippingMethod: z.enum(SHIPPING_METHODS),
    shippingCost: z.number().min(0).default(0),
    discount: z.number().min(0).default(0),
    paymentMethod: z.enum(PAYMENT_METHODS),
    paymentStatus: z.enum(PAYMENT_STATUSES).default("pending"),
    status: z.enum(ORDER_STATUSES).default("pending"),
  })
  .refine((data) => !!data.customerEmail || !!data.customerPhone, {
    message: "Informe e-mail ou telefone do cliente.",
    path: ["customerPhone"],
  });
export type CreateManualOrderInput = z.infer<typeof createManualOrderSchema>;

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
  electricityCostPerKwh: z.number().min(0),
  machineCostPerHour: z.number().min(0),
  laborCostPerHour: z.number().min(0),
  defaultWasteRatePercent: z.number().min(0).max(100),
  defaultMarginPercent: z.number().min(0).max(100),
});
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;

export const filamentSchema = z.object({
  brand: z.string().min(1).max(120),
  material: z.enum(FILAMENT_MATERIALS),
  color: z.string().min(1).max(60),
  colorHex: z.string().max(9).nullable().optional(),
  spoolWeightGrams: z.number().int().positive(),
  remainingWeightGrams: z.number().int().min(0),
  costPerSpool: z.number().positive(),
  lowStockThresholdGrams: z.number().int().min(0).default(150),
  supplierId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  active: z.boolean().default(true),
});
export type FilamentInput = z.infer<typeof filamentSchema>;

export const filamentUpdateSchema = filamentSchema.omit({ remainingWeightGrams: true });
export type FilamentUpdateInput = z.infer<typeof filamentUpdateSchema>;

export const filamentMovementSchema = z.object({
  type: z.enum(FILAMENT_MOVEMENT_TYPES),
  changeGrams: z.number().int().refine((v) => v !== 0, "A quantidade não pode ser zero."),
  reason: z.string().max(200).optional(),
});
export type FilamentMovementInput = z.infer<typeof filamentMovementSchema>;

export const printerSchema = z.object({
  name: z.string().min(1).max(120),
  model: z.string().max(120).nullable().optional(),
  wattage: z.number().int().positive().default(150),
  purchaseCost: z.number().positive().nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  active: z.boolean().default(true),
});
export type PrinterInput = z.infer<typeof printerSchema>;

export const printerStatusSchema = z.object({
  status: z.enum(["idle", "maintenance", "offline"]),
});
export type PrinterStatusInput = z.infer<typeof printerStatusSchema>;

export const printerMaintenanceLogSchema = z.object({
  description: z.string().min(1).max(200),
  cost: z.number().positive().nullable().optional(),
  hoursAtMaintenance: z.number().positive().nullable().optional(),
});
export type PrinterMaintenanceLogInput = z.infer<typeof printerMaintenanceLogSchema>;

export const printJobSchema = z.object({
  label: z.string().min(1).max(200),
  printerId: z.string().uuid().nullable().optional(),
  filamentId: z.string().uuid().nullable().optional(),
  orderItemId: z.string().uuid().nullable().optional(),
  customQuoteId: z.string().uuid().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  weightGramsUsed: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type PrintJobInput = z.infer<typeof printJobSchema>;

export const printJobStatusUpdateSchema = z.object({
  status: z.enum(PRINT_JOB_STATUSES),
  actualMinutes: z.number().int().positive().nullable().optional(),
  weightGramsUsed: z.number().int().positive().nullable().optional(),
});
export type PrintJobStatusUpdateInput = z.infer<typeof printJobStatusUpdateSchema>;

export const supplierSchema = z.object({
  name: z.string().min(1).max(160),
  contactName: z.string().max(160).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  active: z.boolean().default(true),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const purchaseOrderItemSchema = z.object({
  filamentId: z.string().uuid(),
  quantityGrams: z.number().int().positive(),
  totalCost: z.number().positive(),
});
export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "Adicione ao menos um item."),
});
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

export const purchaseOrderStatusSchema = z.object({
  status: z.enum(["received", "cancelled"]),
});
export type PurchaseOrderStatusInput = z.infer<typeof purchaseOrderStatusSchema>;

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
