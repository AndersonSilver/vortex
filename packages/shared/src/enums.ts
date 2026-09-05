export const USER_ROLES = ["customer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

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

// "bling" = pedido importado via Bling ERP, que centraliza os pedidos de qualquer loja/marketplace
// que o usuário conectar lá dentro (Shopee, TikTok Shop, Mercado Livre, etc) — ver Order.originLabel
// para saber de qual loja dentro do Bling o pedido veio.
export const ORDER_CHANNELS = ["site", "manual", "bling"] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = {
  site: "Site",
  manual: "Manual",
  bling: "Bling",
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

// "bling" = frete/rastreio controlado pela própria loja de origem (Shopee/TikTok/Mercado Livre etc),
// não pelos Correios/Melhor Envio do Vortex — usado nos pedidos importados via createMarketplaceOrder.
export const SHIPPING_METHODS = ["pac", "sedex", "pickup", "bling"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const COUPON_TYPES = ["percent", "fixed", "free_shipping"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

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

// --- Controle de custos -------------------------------------------------------

/**
 * Comportamento do custo. Define para onde o gasto vai na formação de preço:
 * - direct_variable: entra no custo unitário do produto (filamento, embalagem);
 * - indirect_fixed: entra no overhead rateado por hora (aluguel, internet);
 * - capex: investimento em ativo, entra amortizado como depreciação mensal.
 */
export const EXPENSE_CATEGORY_KINDS = ["direct_variable", "indirect_fixed", "capex"] as const;
export type ExpenseCategoryKind = (typeof EXPENSE_CATEGORY_KINDS)[number];

export const EXPENSE_CATEGORY_KIND_LABELS: Record<ExpenseCategoryKind, string> = {
  direct_variable: "Custo variável",
  indirect_fixed: "Custo fixo",
  capex: "Investimento (ativo)",
};

/** O que a categoria movimenta quando a compra é recebida. */
export const EXPENSE_CATEGORY_TARGETS = ["none", "filament", "supply", "asset"] as const;
export type ExpenseCategoryTarget = (typeof EXPENSE_CATEGORY_TARGETS)[number];

export const EXPENSE_CATEGORY_TARGET_LABELS: Record<ExpenseCategoryTarget, string> = {
  none: "Nenhum (só despesa)",
  filament: "Estoque de filamento",
  supply: "Estoque de insumo",
  asset: "Ativo (equipamento/ferramenta)",
};

export const MEASUREMENT_UNITS = ["g", "kg", "un", "cx", "m", "L", "ml", "h"] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

export const MEASUREMENT_UNIT_LABELS: Record<MeasurementUnit, string> = {
  g: "g",
  kg: "kg",
  un: "un",
  cx: "cx",
  m: "m",
  L: "L",
  ml: "ml",
  h: "h",
};

export const SUPPLY_MOVEMENT_TYPES = ["purchase", "consumption", "adjustment", "waste"] as const;
export type SupplyMovementType = (typeof SUPPLY_MOVEMENT_TYPES)[number];

export const SUPPLY_MOVEMENT_TYPE_LABELS: Record<SupplyMovementType, string> = {
  purchase: "Compra",
  consumption: "Consumo",
  adjustment: "Ajuste",
  waste: "Perda",
};

export const ASSET_STATUSES = ["active", "maintenance", "retired"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: "Em uso",
  maintenance: "Em manutenção",
  retired: "Baixado",
};

export const RECURRENCE_PERIODS = ["monthly", "yearly"] as const;
export type RecurrencePeriod = (typeof RECURRENCE_PERIODS)[number];

export const RECURRENCE_PERIOD_LABELS: Record<RecurrencePeriod, string> = {
  monthly: "Mensal",
  yearly: "Anual",
};

export const EXPENSE_PAYMENT_METHODS = ["pix", "card", "boleto", "cash", "transfer", "other"] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export const EXPENSE_PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  pix: "Pix",
  card: "Cartão",
  boleto: "Boleto",
  cash: "Dinheiro",
  transfer: "Transferência",
  other: "Outro",
};

/** De onde o lançamento do livro de despesas veio. */
export const EXPENSE_SOURCES = ["purchase_order", "recurring", "depreciation", "manual"] as const;
export type ExpenseSource = (typeof EXPENSE_SOURCES)[number];

export const EXPENSE_SOURCE_LABELS: Record<ExpenseSource, string> = {
  purchase_order: "Compra",
  recurring: "Despesa fixa",
  depreciation: "Depreciação",
  manual: "Lançamento manual",
};
