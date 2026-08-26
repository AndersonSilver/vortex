export interface BlingOrderItem {
  /** Bling item "código" — matched against Product.sku. */
  sku: string;
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
}

export interface NormalizedBlingOrder {
  /** Bling's own sales order id. */
  externalOrderId: string;
  /** Name of the store inside Bling this order came from (Shopee, TikTok Shop, Mercado Livre, ...). */
  originLabel: string | null;
  customerName: string;
  customerPhone: string | null;
  shippingCep: string;
  shippingState: string;
  shippingCity: string;
  shippingNeighborhood: string;
  shippingStreet: string;
  shippingNumber: string;
  shippingComplement: string | null;
  shippingCost: number;
  /** Order-level discount already reflected in Bling's own `total`, in R$ (not percent). */
  discount: number;
  items: BlingOrderItem[];
}
