export const USER_ROLES = ["customer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PRODUCT_CATEGORIES = [
  "figurines",
  "industrial",
  "decor",
  "tech",
  "toys",
] as const;
export type ProductCategoryKey = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategoryKey, string> = {
  figurines: "Miniaturas",
  industrial: "Industrial",
  decor: "Decoração",
  tech: "Tech",
  toys: "Brinquedos",
};

export const PRODUCT_BADGES = ["new", "hot", "sale"] as const;
export type ProductBadge = (typeof PRODUCT_BADGES)[number];

export const ORDER_STATUSES = [
  "pending",
  "printing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Aguardando",
  printing: "Imprimindo",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export const PAYMENT_METHODS = ["pix", "card", "boleto"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "refunded",
  "cancelled",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SHIPPING_METHODS = ["pac", "sedex", "pickup"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const COUPON_TYPES = ["percent", "fixed", "free_shipping"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const CUSTOM_QUOTE_STATUSES = ["pending", "quoted", "rejected"] as const;
export type CustomQuoteStatus = (typeof CUSTOM_QUOTE_STATUSES)[number];

export const FILAMENT_MATERIALS = [
  "PLA",
  "PETG",
  "ABS",
  "ABS_PLUS",
  "TPU",
  "NYLON",
  "RESIN",
  "OUTRO",
] as const;
export type FilamentMaterialType = (typeof FILAMENT_MATERIALS)[number];

export const FILAMENT_MATERIAL_LABELS: Record<FilamentMaterialType, string> = {
  PLA: "PLA",
  PETG: "PETG",
  ABS: "ABS",
  ABS_PLUS: "ABS+",
  TPU: "TPU",
  NYLON: "Nylon",
  RESIN: "Resina",
  OUTRO: "Outro",
};

export const FILAMENT_MOVEMENT_TYPES = ["purchase", "consumption", "adjustment", "waste"] as const;
export type FilamentMovementType = (typeof FILAMENT_MOVEMENT_TYPES)[number];

export const FILAMENT_MOVEMENT_TYPE_LABELS: Record<FilamentMovementType, string> = {
  purchase: "Compra",
  consumption: "Consumo",
  adjustment: "Ajuste",
  waste: "Perda",
};

export const PRINTER_STATUSES = ["idle", "printing", "maintenance", "offline"] as const;
export type PrinterStatus = (typeof PRINTER_STATUSES)[number];

export const PRINTER_STATUS_LABELS: Record<PrinterStatus, string> = {
  idle: "Ociosa",
  printing: "Imprimindo",
  maintenance: "Manutenção",
  offline: "Offline",
};

export const PRINT_JOB_STATUSES = ["queued", "printing", "done", "failed"] as const;
export type PrintJobStatus = (typeof PRINT_JOB_STATUSES)[number];

export const PRINT_JOB_STATUS_LABELS: Record<PrintJobStatus, string> = {
  queued: "Na fila",
  printing: "Imprimindo",
  done: "Concluído",
  failed: "Falhou",
};

export const PURCHASE_ORDER_STATUSES = ["pending", "received", "cancelled"] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  pending: "Pendente",
  received: "Recebida",
  cancelled: "Cancelada",
};
