import { In } from "typeorm";
import type { ProductProfitDTO, SalesReportDTO } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { OrderItem, Product } from "../../entities";

const orderItemRepo = () => AppDataSource.getRepository(OrderItem);
const productRepo = () => AppDataSource.getRepository(Product);

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

interface ItemFinancial {
  orderId: string;
  productId: string;
  name: string;
  qty: number;
  revenue: number;
  cost: number;
  createdAt: Date;
}

export async function getOrderItemsWithCost(from: Date, to: Date): Promise<ItemFinancial[]> {
  const items = await orderItemRepo()
    .createQueryBuilder("item")
    .innerJoinAndSelect("item.order", "order")
    .where("order.createdAt >= :from", { from })
    .andWhere("order.createdAt <= :to", { to })
    .andWhere("order.status != :cancelled", { cancelled: "cancelled" })
    .getMany();

  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  const products = productIds.length
    ? await productRepo().find({ where: { id: In(productIds) }, select: ["id", "costPrice"] })
    : [];
  const costMap = new Map(
    products.map((p) => [p.id, p.costPrice !== null && p.costPrice !== undefined ? Number(p.costPrice) : null]),
  );

  return items.map((item) => {
    const revenue = Number(item.priceSnapshot) * item.qty;
    const unitCost =
      item.costPriceSnapshot !== null && item.costPriceSnapshot !== undefined
        ? Number(item.costPriceSnapshot)
        : (costMap.get(item.productId) ?? 0);
    return {
      orderId: item.orderId,
      productId: item.productId,
      name: item.nameSnapshot,
      qty: item.qty,
      revenue,
      cost: unitCost * item.qty,
      createdAt: item.order.createdAt,
    };
  });
}

export async function getProductProfitReport(from: Date, to: Date): Promise<ProductProfitDTO[]> {
  const items = await getOrderItemsWithCost(from, to);

  const map = new Map<string, { name: string; unitsSold: number; revenue: number; cost: number }>();
  for (const item of items) {
    const existing = map.get(item.productId) ?? { name: item.name, unitsSold: 0, revenue: 0, cost: 0 };
    existing.unitsSold += item.qty;
    existing.revenue += item.revenue;
    existing.cost += item.cost;
    map.set(item.productId, existing);
  }

  return Array.from(map.entries())
    .map(([productId, v]) => {
      const profit = v.revenue - v.cost;
      return {
        productId,
        name: v.name,
        unitsSold: v.unitsSold,
        revenue: v.revenue,
        cost: v.cost,
        profit,
        marginPercent: v.revenue > 0 ? (profit / v.revenue) * 100 : 0,
      };
    })
    .sort((a, b) => b.profit - a.profit);
}

export async function getSalesReport(from: Date, to: Date): Promise<SalesReportDTO> {
  const items = await getOrderItemsWithCost(from, to);

  const byDayMap = new Map<string, { revenue: number; cost: number }>();
  const cursor = startOfDay(from);
  const endDay = startOfDay(to);
  while (cursor <= endDay) {
    byDayMap.set(cursor.toDateString(), { revenue: 0, cost: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  let revenue = 0;
  let cost = 0;
  const orderIds = new Set<string>();
  for (const item of items) {
    revenue += item.revenue;
    cost += item.cost;
    orderIds.add(item.orderId);
    const bucket = byDayMap.get(startOfDay(item.createdAt).toDateString());
    if (bucket) {
      bucket.revenue += item.revenue;
      bucket.cost += item.cost;
    }
  }

  const byDay = Array.from(byDayMap.entries()).map(([dateStr, v]) => {
    const date = new Date(dateStr);
    return {
      date: dateStr,
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      revenue: v.revenue,
      cost: v.cost,
      profit: v.revenue - v.cost,
    };
  });

  const profit = revenue - cost;
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    revenue,
    cost,
    profit,
    marginPercent: revenue > 0 ? (profit / revenue) * 100 : 0,
    ordersCount: orderIds.size,
    byDay,
  };
}
