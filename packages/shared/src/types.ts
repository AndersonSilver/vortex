import type {
  CouponType,
  CustomQuoteStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductBadge,
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
  ordersToday: number;
  averageTicket: number;
  activeCustomers: number;
  salesLast7Days: { label: string; total: number }[];
  statusBreakdown: { status: OrderStatus; count: number }[];
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
}
