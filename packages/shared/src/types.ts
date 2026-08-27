import type {
  AssetStatus,
  CouponType,
  CustomQuoteStatus,
  DiscountType,
  ExpenseCategoryKind,
  ExpenseCategoryTarget,
  ExpensePaymentMethod,
  ExpenseSource,
  MeasurementUnit,
  OrderChannel,
  RecurrencePeriod,
  SupplyMovementType,
  FilamentMaterialType,
  FilamentMovementType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrinterStatus,
  PrintJobStatus,
  ProductBadge,
  PurchaseOrderStatus,
  ProductCategoryKey,
  ShippingMethod,
  UserRole,
} from "./enums";

export interface ProductSpecs {
  [label: string]: string;
}

export interface ProductDTO {
  id: string;
  slug: string;
  sku: string | null;
  marketplaceAliases: string[];
  name: string;
  category: ProductCategoryKey;
  description: string;
  price: number;
  oldPrice: number | null;
  emoji: string;
  imageUrl: string | null;
  images: string[];
  videoUrl: string | null;
  badge: ProductBadge | null;
  colors: string[];
  material: string;
  specs: ProductSpecs;
  rating: number;
  reviewsCount: number;
  stock: number;
  active: boolean;
  filamentId: string | null;
  weightGrams: number | null;
  printTimeMinutes: number | null;
  costPrice: number | null;
}

export interface AddressDTO {
  id: string;
  label: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string | null;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: string;
}

export interface CartItemDTO {
  id: string;
  product: ProductDTO;
  qty: number;
  color: string;
  material: string;
}

export interface CouponDTO {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  uses: number;
  maxUses: number;
  expiresAt: string;
  active: boolean;
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  name: string;
  price: number;
  costPrice: number | null;
  qty: number;
  color: string;
  material: string;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discount: number;
  discountType: DiscountType;
  discountValue: number;
  shippingCost: number;
  total: number;
  shippingMethod: ShippingMethod;
  couponCode: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  isManual: boolean;
  channel: OrderChannel;
  externalOrderId: string | null;
  originLabel: string | null;
  addressSnapshot: AddressDTO | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  items: OrderItemDTO[];
  createdAt: string;
}

export interface ShippingQuoteOption {
  method: ShippingMethod;
  label: string;
  price: number;
  estimatedDays: number;
  source: "correios" | "fallback" | "pickup";
  carrier: string;
}

export interface CustomQuoteDTO {
  id: string;
  fileUrl: string;
  material: string;
  color: string;
  qty: number;
  notes: string | null;
  email: string;
  status: CustomQuoteStatus;
  quotedPrice: number | null;
  createdAt: string;
}

export interface DashboardStatsDTO {
  monthRevenue: number;
  monthProfit: number;
  monthMarginPercent: number;
  ordersToday: number;
  averageTicket: number;
  activeCustomers: number;
  salesLast7Days: { label: string; total: number }[];
  statusBreakdown: { status: OrderStatus; count: number }[];
}

export interface ProductProfitDTO {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
}

export interface SalesReportDTO {
  from: string;
  to: string;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
  ordersCount: number;
  byDay: { date: string; label: string; revenue: number; cost: number; profit: number }[];
}

export interface PaymentResultDTO {
  id: string;
  status: PaymentStatus;
  method: PaymentMethod;
  mpPaymentId: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  barcode: string | null;
}

export interface StoreSettingsDTO {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeCnpj: string;
  freeShippingThreshold: number;
  pixDiscountPercent: number;
  boletoDiscountPercent: number;
  installmentsWithoutInterest: number;
  pixKey: string;
  notifyNewOrder: boolean;
  notifyPaymentConfirmed: boolean;
  notifyLowStock: boolean;
  electricityCostPerKwh: number;
  machineCostPerHour: number;
  laborCostPerHour: number;
  defaultWasteRatePercent: number;
  defaultMarginPercent: number;
  overheadCostPerHour: number;
  overheadHoursPerMonth: number;
  autoCostRates: boolean;
}

export interface FilamentDTO {
  id: string;
  brand: string;
  material: FilamentMaterialType;
  color: string;
  colorHex: string | null;
  spoolWeightGrams: number;
  remainingWeightGrams: number;
  costPerSpool: number;
  lowStockThresholdGrams: number;
  supplierId: string | null;
  supplierName: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierDTO {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItemDTO {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryKind: ExpenseCategoryKind;
  categoryTarget: ExpenseCategoryTarget;
  /** Rótulo pronto para exibição: nome do filamento, do insumo, do ativo ou a descrição livre. */
  label: string;
  description: string | null;
  filamentId: string | null;
  supplyId: string | null;
  assetId: string | null;
  quantity: number;
  unit: MeasurementUnit;
  unitCost: number;
  totalCost: number;
  /** Custo com o rateio de frete/encargos/desconto, preenchido no recebimento. */
  allocatedCost: number | null;
}

export interface PurchaseOrderDTO {
  id: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  documentNumber: string | null;
  purchasedAt: string;
  freightCost: number;
  otherCharges: number;
  discount: number;
  paymentMethod: ExpensePaymentMethod | null;
  installments: number;
  notes: string | null;
  receivedAt: string | null;
  items: PurchaseOrderItemDTO[];
  /** Soma dos itens, sem frete/encargos/desconto. */
  itemsCost: number;
  /** itemsCost + frete + encargos - desconto. É o que saiu do caixa. */
  totalCost: number;
  createdAt: string;
}

export interface FilamentMovementDTO {
  id: string;
  filamentId: string;
  type: FilamentMovementType;
  changeGrams: number;
  reason: string | null;
  createdAt: string;
}

export interface PrinterDTO {
  id: string;
  name: string;
  model: string | null;
  status: PrinterStatus;
  wattage: number;
  totalPrintHours: number;
  purchaseCost: number | null;
  location: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrinterMaintenanceLogDTO {
  id: string;
  printerId: string;
  description: string;
  cost: number | null;
  hoursAtMaintenance: number | null;
  createdAt: string;
}

export interface PrintJobDTO {
  id: string;
  label: string;
  printerId: string | null;
  filamentId: string | null;
  orderItemId: string | null;
  customQuoteId: string | null;
  status: PrintJobStatus;
  progressPercent: number | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  weightGramsUsed: number | null;
  notes: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Controle de custos -------------------------------------------------------

export interface ExpenseCategoryDTO {
  id: string;
  name: string;
  kind: ExpenseCategoryKind;
  target: ExpenseCategoryTarget;
  emoji: string;
  system: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyDTO {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unit: MeasurementUnit;
  quantityOnHand: number;
  avgUnitCost: number;
  lowStockThreshold: number;
  supplierId: string | null;
  supplierName: string | null;
  notes: string | null;
  active: boolean;
  /** quantityOnHand * avgUnitCost */
  stockValue: number;
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyMovementDTO {
  id: string;
  supplyId: string;
  type: SupplyMovementType;
  changeQuantity: number;
  unitCost: number | null;
  reason: string | null;
  createdAt: string;
}

export interface AssetDTO {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  printerId: string | null;
  printerName: string | null;
  status: AssetStatus;
  acquiredAt: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  expectedHoursPerMonth: number;
  notes: string | null;
  disposedAt: string | null;
  /** (acquisitionCost - salvageValue) / usefulLifeMonths */
  monthlyDepreciation: number;
  /** Depreciação acumulada até hoje, limitada ao valor depreciável. */
  accumulatedDepreciation: number;
  bookValue: number;
  /** monthlyDepreciation / expectedHoursPerMonth, quando houver horas previstas. */
  costPerHour: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringExpenseDTO {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  period: RecurrencePeriod;
  dueDay: number | null;
  startDate: string;
  endDate: string | null;
  supplierId: string | null;
  supplierName: string | null;
  paymentMethod: ExpensePaymentMethod | null;
  notes: string | null;
  active: boolean;
  /** amount normalizado para mês (anual / 12). */
  monthlyAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseEntryDTO {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryKind: ExpenseCategoryKind;
  description: string;
  amount: number;
  incurredAt: string;
  source: ExpenseSource;
  supplierId: string | null;
  supplierName: string | null;
  purchaseOrderId: string | null;
  recurringExpenseId: string | null;
  assetId: string | null;
  paymentMethod: ExpensePaymentMethod | null;
  attachmentUrl: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ExpenseByCategoryDTO {
  categoryId: string;
  categoryName: string;
  kind: ExpenseCategoryKind;
  total: number;
  sharePercent: number;
}

export interface ExpenseSummaryDTO {
  from: string;
  to: string;
  total: number;
  byKind: Record<ExpenseCategoryKind, number>;
  bySource: Record<ExpenseSource, number>;
  byCategory: ExpenseByCategoryDTO[];
  byMonth: Array<{ month: string; label: string; total: number }>;
}

/** Demonstrativo de resultado do período: receita menos cada camada de custo. */
export interface ProfitLossReportDTO {
  from: string;
  to: string;
  revenue: number;
  /** Custo dos produtos vendidos, do snapshot de custo do item de pedido. */
  productCost: number;
  grossProfit: number;
  variableExpenses: number;
  fixedExpenses: number;
  depreciation: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  ordersCount: number;
}

/** Taxas horárias derivadas dos gastos reais, para alimentar a precificação. */
export interface CostRatesDTO {
  monthlyDepreciation: number;
  monthlyFixedExpenses: number;
  monthlyMaintenance: number;
  productiveHoursPerMonth: number;
  printerHoursPerMonth: number;
  /** (depreciação + manutenção) / horas de impressora previstas */
  suggestedMachineCostPerHour: number;
  /** custo fixo mensal / horas produtivas */
  suggestedOverheadCostPerHour: number;
  configuredMachineCostPerHour: number;
  configuredOverheadCostPerHour: number;
  autoCostRates: boolean;
  /** Quantos meses de gasto real sustentam esses números. */
  assetsCount: number;
  recurringCount: number;
}
