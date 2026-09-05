import { z } from "zod";
import {
  ASSET_STATUSES,
  COUPON_TYPES,
  DISCOUNT_TYPES,
  EXPENSE_CATEGORY_KINDS,
  EXPENSE_CATEGORY_TARGETS,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_SOURCES,
  FILAMENT_MATERIALS,
  FILAMENT_MOVEMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRINT_JOB_STATUSES,
  PRODUCT_BADGES,
  MEASUREMENT_UNITS,
  RECURRENCE_PERIODS,
  SHIPPING_METHODS,
  SUPPLY_MOVEMENT_TYPES,
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
  sku: z.string().trim().min(1).max(64).nullable().optional(),
  marketplaceAliases: z.array(z.string().trim().min(1)).default([]),
  /** Slug de uma categoria cadastrada; a existência é conferida na rota. */
  category: z.string().min(1).max(60),
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

export const productCategorySchema = z.object({
  name: z.string().min(1).max(120),
  emoji: z.string().max(8).default("📦"),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});
export type ProductCategoryInput = z.infer<typeof productCategorySchema>;

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
    discountType: z.enum(DISCOUNT_TYPES).default("fixed"),
    discountValue: z.number().min(0).default(0),
    paymentMethod: z.enum(PAYMENT_METHODS),
    paymentStatus: z.enum(PAYMENT_STATUSES).default("pending"),
    status: z.enum(ORDER_STATUSES).default("pending"),
  })
  .refine((data) => !!data.customerEmail || !!data.customerPhone, {
    message: "Informe e-mail ou telefone do cliente.",
    path: ["customerPhone"],
  })
  .refine((data) => data.discountType !== "percent" || data.discountValue <= 100, {
    message: "Desconto percentual não pode passar de 100%.",
    path: ["discountValue"],
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
  overheadCostPerHour: z.number().min(0),
  overheadHoursPerMonth: z.number().int().min(1).max(744),
  autoCostRates: z.boolean(),
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

/** Dados do ativo criado quando o item é de uma categoria capex. */
export const purchaseOrderAssetSchema = z.object({
  usefulLifeMonths: z.number().int().min(1).max(600),
  salvageValue: z.number().min(0).default(0),
  expectedHoursPerMonth: z.number().min(0).max(744).default(0),
  printerId: z.string().uuid().nullable().optional(),
});
export type PurchaseOrderAssetInput = z.infer<typeof purchaseOrderAssetSchema>;

export const purchaseOrderItemSchema = z
  .object({
    categoryId: z.string().uuid(),
    description: z.string().max(200).nullable().optional(),
    filamentId: z.string().uuid().nullable().optional(),
    supplyId: z.string().uuid().nullable().optional(),
    /** Cria um insumo novo já na compra, quando supplyId não é informado. */
    newSupplyName: z.string().min(1).max(160).nullable().optional(),
    asset: purchaseOrderAssetSchema.nullable().optional(),
    quantity: z.number().positive(),
    unit: z.enum(MEASUREMENT_UNITS),
    totalCost: z.number().min(0),
  })
  .refine((item) => item.filamentId || item.supplyId || item.newSupplyName || item.description, {
    message: "Informe o filamento, o insumo ou uma descrição para o item.",
    path: ["description"],
  });
export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  documentNumber: z.string().max(60).nullable().optional(),
  purchasedAt: z.string().min(1).optional(),
  freightCost: z.number().min(0).default(0),
  otherCharges: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).nullable().optional(),
  installments: z.number().int().min(1).max(48).default(1),
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

export const updateManualOrderDiscountSchema = z
  .object({
    discountType: z.enum(DISCOUNT_TYPES),
    discountValue: z.number().min(0),
  })
  .refine((data) => data.discountType !== "percent" || data.discountValue <= 100, {
    message: "Desconto percentual não pode passar de 100%.",
    path: ["discountValue"],
  });
export type UpdateManualOrderDiscountInput = z.infer<typeof updateManualOrderDiscountSchema>;

// --- Controle de custos -------------------------------------------------------

export const expenseCategorySchema = z.object({
  name: z.string().min(1).max(120),
  kind: z.enum(EXPENSE_CATEGORY_KINDS),
  target: z.enum(EXPENSE_CATEGORY_TARGETS).default("none"),
  emoji: z.string().max(8).default("💸"),
  active: z.boolean().default(true),
});
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;

export const supplySchema = z.object({
  name: z.string().min(1).max(160),
  categoryId: z.string().uuid(),
  unit: z.enum(MEASUREMENT_UNITS),
  quantityOnHand: z.number().min(0).default(0),
  avgUnitCost: z.number().min(0).default(0),
  lowStockThreshold: z.number().min(0).default(0),
  supplierId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  active: z.boolean().default(true),
});
export type SupplyInput = z.infer<typeof supplySchema>;

export const supplyUpdateSchema = supplySchema.omit({ quantityOnHand: true, avgUnitCost: true });
export type SupplyUpdateInput = z.infer<typeof supplyUpdateSchema>;

export const supplyMovementSchema = z.object({
  type: z.enum(SUPPLY_MOVEMENT_TYPES),
  changeQuantity: z.number().refine((value) => value !== 0, "A quantidade não pode ser zero."),
  unitCost: z.number().min(0).nullable().optional(),
  reason: z.string().max(200).nullable().optional(),
});
export type SupplyMovementInput = z.infer<typeof supplyMovementSchema>;

export const assetSchema = z.object({
  name: z.string().min(1).max(160),
  categoryId: z.string().uuid(),
  printerId: z.string().uuid().nullable().optional(),
  status: z.enum(ASSET_STATUSES).default("active"),
  acquiredAt: z.string().min(1),
  acquisitionCost: z.number().min(0),
  salvageValue: z.number().min(0).default(0),
  usefulLifeMonths: z.number().int().min(1).max(600),
  expectedHoursPerMonth: z.number().min(0).max(744).default(0),
  notes: z.string().max(2000).nullable().optional(),
});
export type AssetInput = z.infer<typeof assetSchema>;

export const recurringExpenseSchema = z.object({
  name: z.string().min(1).max(160),
  categoryId: z.string().uuid(),
  amount: z.number().min(0),
  period: z.enum(RECURRENCE_PERIODS).default("monthly"),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1).nullable().optional(),
  supplierId: z.string().uuid().nullable().optional(),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  active: z.boolean().default(true),
});
export type RecurringExpenseInput = z.infer<typeof recurringExpenseSchema>;

export const expenseEntrySchema = z.object({
  categoryId: z.string().uuid(),
  description: z.string().min(1).max(200),
  amount: z.number().min(0),
  incurredAt: z.string().min(1),
  supplierId: z.string().uuid().nullable().optional(),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).nullable().optional(),
  attachmentUrl: z.string().url().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type ExpenseEntryInput = z.infer<typeof expenseEntrySchema>;

export const expenseQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  source: z.enum(EXPENSE_SOURCES).optional(),
});
export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;

/** Gera os lançamentos de despesa fixa e depreciação de um mês (formato YYYY-MM). */
export const postMonthSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use o formato AAAA-MM."),
});
export type PostMonthInput = z.infer<typeof postMonthSchema>;
