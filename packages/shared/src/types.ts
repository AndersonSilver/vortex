import type {
  CouponType,
  CustomQuoteStatus,
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
  name: string;
  category: ProductCategoryKey;
  description: string;
  price: number;
  oldPrice: number | null;
  emoji: string;
  imageUrl: string | null;
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
  shippingCost: number;
  total: number;
  shippingMethod: ShippingMethod;
  couponCode: string | null;
  customerName: string;
  customerEmail: string;
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
  filamentId: string;
  filamentLabel: string;
  quantityGrams: number;
  totalCost: number;
}

export interface PurchaseOrderDTO {
  id: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  notes: string | null;
  receivedAt: string | null;
  items: PurchaseOrderItemDTO[];
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
