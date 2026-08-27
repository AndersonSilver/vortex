import { randomUUID } from "node:crypto";
import { In } from "typeorm";
import type {
  AddressDTO,
  CreateManualOrderInput,
  CreateOrderInput,
  OrderDTO,
  OrderItemDTO,
  UpdateManualOrderDiscountInput,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Address, CartItem, Coupon, Order, OrderItem, Product, User } from "../../entities";
import { HttpError } from "../../utils/async-handler";
import { calculateDiscount, calculateManualDiscount, calculateSubtotal, isCouponUsable } from "../../utils/pricing";
import { getSettingsEntity } from "../settings/settings.service";
import { quoteShipping } from "../shipping/shipping-provider.service";
import { toAddressDTO } from "../addresses/addresses.routes";
import type { NormalizedBlingOrder } from "../bling/bling-order.types";

const orderRepo = () => AppDataSource.getRepository(Order);
const cartRepo = () => AppDataSource.getRepository(CartItem);
const addressRepo = () => AppDataSource.getRepository(Address);
const couponRepo = () => AppDataSource.getRepository(Coupon);
const userRepo = () => AppDataSource.getRepository(User);
const productRepo = () => AppDataSource.getRepository(Product);

const WEIGHT_PER_UNIT_KG = 0.25;
const BASE_DIMENSIONS_CM = { lengthCm: 20, widthCm: 15, heightCm: 10 };

function toOrderItemDTO(item: OrderItem): OrderItemDTO {
  return {
    id: item.id,
    productId: item.productId ?? null,
    name: item.nameSnapshot,
    price: Number(item.priceSnapshot),
    costPrice:
      item.costPriceSnapshot !== null && item.costPriceSnapshot !== undefined ? Number(item.costPriceSnapshot) : null,
    qty: item.qty,
    color: item.color,
    material: item.material,
  };
}

export function toOrderDTO(order: Order): OrderDTO {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    discountType: order.discountType,
    discountValue: Number(order.discountValue),
    shippingCost: Number(order.shippingCost),
    total: Number(order.total),
    shippingMethod: order.shippingMethod,
    couponCode: order.couponCode ?? null,
    customerName: order.customerName,
    customerEmail: order.customerEmail ?? null,
    customerPhone: order.customerPhone ?? null,
    isManual: order.isManual,
    channel: order.channel,
    externalOrderId: order.externalOrderId ?? null,
    marketplaceOrderNumber: order.marketplaceOrderNumber ?? null,
    originLabel: order.originLabel ?? null,
    addressSnapshot: order.addressSnapshot ?? null,
    trackingCode: order.trackingCode ?? null,
    trackingUrl: order.trackingUrl ?? null,
    viewedAt: order.viewedAt ? order.viewedAt.toISOString() : null,
    items: order.items.map(toOrderItemDTO),
    createdAt: order.createdAt.toISOString(),
  };
}

async function generateOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `VX-${Math.floor(100000 + Math.random() * 900000)}`;
    const exists = await orderRepo().findOneBy({ orderNumber: candidate });
    if (!exists) return candidate;
  }
  throw new HttpError(500, "Não foi possível gerar o número do pedido.");
}

export async function createOrder(userId: string, input: CreateOrderInput): Promise<OrderDTO> {
  const cartItems = await cartRepo().find({
    where: { userId },
    relations: { product: true },
  });
  if (cartItems.length === 0) {
    throw new HttpError(400, "Seu carrinho está vazio.");
  }

  const address = await addressRepo().findOneBy({ id: input.addressId, userId });
  if (!address) {
    throw new HttpError(404, "Endereço não encontrado.");
  }

  const user = await userRepo().findOneBy({ id: userId });
  if (!user) {
    throw new HttpError(404, "Usuário não encontrado.");
  }

  const subtotal = calculateSubtotal(
    cartItems.map((i) => ({ price: Number(i.product.price), qty: i.qty })),
  );

  let coupon: Coupon | null = null;
  let discount = 0;
  if (input.couponCode) {
    coupon = await couponRepo().findOneBy({ code: input.couponCode.toUpperCase().trim() });
    if (!coupon) {
      throw new HttpError(400, "Cupom inválido ou expirado.");
    }
    const usable = isCouponUsable(coupon, subtotal);
    if (!usable.ok) {
      throw new HttpError(400, usable.reason);
    }
  }

  const settings = await getSettingsEntity();

  let shippingCost = 0;
  if (input.shippingMethod !== "pickup") {
    const totalQty = cartItems.reduce((sum, item) => sum + item.qty, 0) || 1;
    const options = await quoteShipping(address.cep, {
      weightKg: totalQty * WEIGHT_PER_UNIT_KG,
      ...BASE_DIMENSIONS_CM,
      heightCm: Math.min(60, BASE_DIMENSIONS_CM.heightCm + totalQty * 2),
    });
    const option = options.find((o) => o.method === input.shippingMethod);
    shippingCost = option?.price ?? 0;
    if (
      input.shippingMethod === "pac" &&
      subtotal - (coupon ? calculateDiscount(coupon, subtotal, shippingCost) : 0) >=
        Number(settings.freeShippingThreshold)
    ) {
      shippingCost = 0;
    }
  }

  if (coupon) {
    discount = calculateDiscount(coupon, subtotal, shippingCost);
    if (coupon.type === "free_shipping") {
      shippingCost = 0;
      discount = 0;
    }
  }

  let merchandiseTotal = Math.max(0, subtotal - discount);
  if (input.paymentMethod === "pix") {
    merchandiseTotal *= 1 - Number(settings.pixDiscountPercent) / 100;
  } else if (input.paymentMethod === "boleto") {
    merchandiseTotal *= 1 - Number(settings.boletoDiscountPercent) / 100;
  }
  const total = Math.max(0, merchandiseTotal + shippingCost);

  const orderNumber = await generateOrderNumber();

  const order = orderRepo().create({
    orderNumber,
    userId,
    customerName: user.name,
    customerEmail: user.email,
    channel: "site",
    status: "pending",
    paymentMethod: input.paymentMethod,
    paymentStatus: "pending",
    subtotal,
    discount,
    shippingCost,
    total,
    shippingMethod: input.shippingMethod,
    couponCode: coupon?.code ?? null,
    addressSnapshot: toAddressDTO(address),
    items: cartItems.map((item) => ({
      productId: item.productId,
      nameSnapshot: item.product.name,
      priceSnapshot: item.product.price,
      costPriceSnapshot: item.product.costPrice ?? null,
      qty: item.qty,
      color: item.color,
      material: item.material,
    })),
  });

  const saved = await orderRepo().save(order);

  if (coupon) {
    coupon.uses += 1;
    await couponRepo().save(coupon);
  }

  await cartRepo().delete({ userId });

  return toOrderDTO(saved);
}

export async function createManualOrder(input: CreateManualOrderInput): Promise<OrderDTO> {
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await productRepo().find({ where: { id: In(productIds) } });
  const productById = new Map(products.map((p) => [p.id, p]));

  const items = input.items.map((item) => {
    const product = productById.get(item.productId);
    if (!product) {
      throw new HttpError(404, `Produto não encontrado: ${item.productId}`);
    }
    return {
      productId: product.id,
      nameSnapshot: product.name,
      priceSnapshot: product.price,
      costPriceSnapshot: product.costPrice ?? null,
      qty: item.qty,
      color: item.color,
      material: item.material,
    };
  });

  const subtotal = calculateSubtotal(items.map((item) => ({ price: Number(item.priceSnapshot), qty: item.qty })));
  const discount = calculateManualDiscount(input.discountType, input.discountValue, subtotal);
  const shippingCost = input.shippingMethod === "pickup" ? 0 : input.shippingCost;
  const total = Math.max(0, subtotal - discount + shippingCost);

  const addressSnapshot: AddressDTO = {
    id: randomUUID(),
    label: input.address.label,
    cep: input.address.cep,
    state: input.address.state,
    city: input.address.city,
    neighborhood: input.address.neighborhood,
    street: input.address.street,
    number: input.address.number,
    complement: input.address.complement ?? null,
  };

  const orderNumber = await generateOrderNumber();

  const order = orderRepo().create({
    orderNumber,
    userId: null,
    customerName: input.customerName,
    customerEmail: input.customerEmail ?? null,
    customerPhone: input.customerPhone ?? null,
    isManual: true,
    channel: "manual",
    status: input.status,
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentStatus,
    subtotal,
    discount,
    discountType: input.discountType,
    discountValue: input.discountValue,
    shippingCost,
    total,
    shippingMethod: input.shippingMethod,
    addressSnapshot,
    items,
  });

  const saved = await orderRepo().save(order);
  return toOrderDTO(saved);
}

/**
 * Ingests an order pulled from Bling (which itself aggregates Shopee/TikTok Shop/Mercado Livre/etc).
 * Idempotent: if this (channel, externalOrderId) pair already exists — Bling retried the webhook, or
 * the order was pushed again on a status change — the existing order is returned untouched.
 */
export async function createMarketplaceOrder(
  input: NormalizedBlingOrder,
): Promise<{ order: OrderDTO; created: boolean }> {
  const existing = await orderRepo().findOneBy({ channel: "bling", externalOrderId: input.externalOrderId });
  if (existing) {
    return { order: toOrderDTO(existing), created: false };
  }

  // Bling order items often carry no SKU at all, and the same product shows up under different
  // SKUs per marketplace listing/variant — so matching keys on either the SKU or the exact item
  // description, against a product's sku plus its curated marketplaceAliases list.
  const allProducts = await productRepo().find();
  const productByAlias = new Map<string, Product>();
  for (const product of allProducts) {
    for (const alias of [product.sku, ...product.marketplaceAliases]) {
      if (alias) productByAlias.set(alias.trim(), product);
    }
  }

  // No match is fine — the order still gets imported with this line item unlinked from the
  // catalog (see OrderItem.productId), just without cost/color/material data to snapshot.
  const items = input.items.map((item) => {
    const product = productByAlias.get(item.sku.trim()) ?? productByAlias.get(item.nameSnapshot.trim());
    return {
      productId: product?.id ?? null,
      nameSnapshot: item.nameSnapshot,
      priceSnapshot: item.priceSnapshot,
      costPriceSnapshot: product?.costPrice ?? null,
      qty: item.qty,
      color: product?.colors[0] ?? "—",
      material: product?.material ?? "—",
    };
  });

  const subtotal = calculateSubtotal(items.map((item) => ({ price: Number(item.priceSnapshot), qty: item.qty })));
  const total = Math.max(0, subtotal - input.discount + input.shippingCost);

  const addressSnapshot: AddressDTO = {
    id: randomUUID(),
    label: input.originLabel ?? "Bling",
    cep: input.shippingCep,
    state: input.shippingState,
    city: input.shippingCity,
    neighborhood: input.shippingNeighborhood,
    street: input.shippingStreet,
    number: input.shippingNumber,
    complement: input.shippingComplement,
  };

  const orderNumber = await generateOrderNumber();

  const order = orderRepo().create({
    orderNumber,
    userId: null,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    channel: "bling",
    externalOrderId: input.externalOrderId,
    marketplaceOrderNumber: input.marketplaceOrderNumber,
    originLabel: input.originLabel,
    status: input.status,
    // Bling only pushes orders that already went through, marketplace payment already settled.
    paymentMethod: "pix",
    paymentStatus: "approved",
    subtotal,
    discount: input.discount,
    discountType: "fixed",
    discountValue: input.discount,
    shippingCost: input.shippingCost,
    total,
    shippingMethod: "bling",
    addressSnapshot,
    items,
    // Overrides the @CreateDateColumn default — the Pedidos list sorts/displays by this, and it
    // should read the real purchase date on the marketplace, not whenever this import ran.
    createdAt: new Date(input.purchasedAt),
  });

  const saved = await orderRepo().save(order);
  return { order: toOrderDTO(saved), created: true };
}

export async function updateManualOrderDiscount(
  id: string,
  input: UpdateManualOrderDiscountInput,
): Promise<OrderDTO> {
  const order = await orderRepo().findOneBy({ id });
  if (!order) throw new HttpError(404, "Pedido não encontrado.");
  if (!order.isManual) {
    throw new HttpError(400, "Só é possível ajustar o desconto de pedidos manuais.");
  }
  const subtotal = Number(order.subtotal);
  const discount = calculateManualDiscount(input.discountType, input.discountValue, subtotal);
  order.discountType = input.discountType;
  order.discountValue = input.discountValue;
  order.discount = discount;
  order.total = Math.max(0, subtotal - discount + Number(order.shippingCost));
  const saved = await orderRepo().save(order);
  return toOrderDTO(saved);
}

export async function listOrdersForUser(userId: string): Promise<OrderDTO[]> {
  const orders = await orderRepo().find({ where: { userId }, order: { createdAt: "DESC" } });
  return orders.map(toOrderDTO);
}

export async function listAllOrders(status?: string): Promise<OrderDTO[]> {
  const orders = await orderRepo().find({
    where: status && status !== "all" ? { status: status as Order["status"] } : {},
    order: { createdAt: "DESC" },
  });
  return orders.map(toOrderDTO);
}

export async function getOrderByIdForUser(userId: string, id: string): Promise<OrderDTO> {
  const order = await orderRepo().findOne({ where: { id, userId } });
  if (!order) throw new HttpError(404, "Pedido não encontrado.");
  return toOrderDTO(order);
}

export async function getOrderById(id: string): Promise<Order> {
  const order = await orderRepo().findOne({ where: { id } });
  if (!order) throw new HttpError(404, "Pedido não encontrado.");
  return order;
}

export async function updateOrderStatus(id: string, status: Order["status"]): Promise<OrderDTO> {
  const order = await orderRepo().findOneBy({ id });
  if (!order) throw new HttpError(404, "Pedido não encontrado.");
  order.status = status;
  const saved = await orderRepo().save(order);
  return toOrderDTO(saved);
}

export async function markOrderViewed(id: string): Promise<OrderDTO> {
  const order = await orderRepo().findOneBy({ id });
  if (!order) throw new HttpError(404, "Pedido não encontrado.");
  if (!order.viewedAt) {
    order.viewedAt = new Date();
    await orderRepo().save(order);
  }
  return toOrderDTO(order);
}

export async function updateOrderTracking(
  id: string,
  trackingCode: string,
  trackingUrl?: string,
): Promise<OrderDTO> {
  const order = await orderRepo().findOneBy({ id });
  if (!order) throw new HttpError(404, "Pedido não encontrado.");
  order.trackingCode = trackingCode;
  order.trackingUrl = trackingUrl ?? `https://www.linkcorreios.com.br/${trackingCode}`;
  if (order.status === "pending" || order.status === "printing") {
    order.status = "shipped";
  }
  const saved = await orderRepo().save(order);
  return toOrderDTO(saved);
}
