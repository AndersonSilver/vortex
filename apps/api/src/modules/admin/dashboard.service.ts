import type { DashboardStatsDTO, OrderStatus } from "@vortex/shared";
import { ORDER_STATUSES } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Order, User } from "../../entities";
import { getOrderItemsWithCost } from "./reports.service";

const orderRepo = () => AppDataSource.getRepository(Order);
const userRepo = () => AppDataSource.getRepository(User);

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export async function getDashboardStats(now: Date = new Date()): Promise<DashboardStatsDTO> {
  const monthStart = startOfMonth(now);
  const todayStart = startOfDay(now);

  const monthOrders = await orderRepo()
    .createQueryBuilder("order")
    .where("order.createdAt >= :monthStart", { monthStart })
    .andWhere("order.status != :cancelled", { cancelled: "cancelled" })
    .getMany();

  const monthRevenue = monthOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const averageTicket = monthOrders.length ? monthRevenue / monthOrders.length : 0;

  const monthItems = await getOrderItemsWithCost(monthStart, now);
  const monthItemsRevenue = monthItems.reduce((sum, i) => sum + i.revenue, 0);
  const monthProfit = monthItems.reduce((sum, i) => sum + (i.revenue - i.cost), 0);
  const monthMarginPercent = monthItemsRevenue > 0 ? (monthProfit / monthItemsRevenue) * 100 : 0;

  const ordersToday = await orderRepo()
    .createQueryBuilder("order")
    .where("order.createdAt >= :todayStart", { todayStart })
    .getCount();

  const activeCustomers = await userRepo().countBy({ role: "customer" });

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const recentOrders = await orderRepo()
    .createQueryBuilder("order")
    .where("order.createdAt >= :from", { from: startOfDay(sevenDaysAgo) })
    .andWhere("order.status != :cancelled", { cancelled: "cancelled" })
    .getMany();

  const salesByDay = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const day = new Date(sevenDaysAgo);
    day.setDate(day.getDate() + i);
    salesByDay.set(day.toDateString(), 0);
  }
  for (const order of recentOrders) {
    const key = order.createdAt.toDateString();
    if (salesByDay.has(key)) {
      salesByDay.set(key, (salesByDay.get(key) ?? 0) + Number(order.total));
    }
  }
  const salesLast7Days = Array.from(salesByDay.entries()).map(([dateStr, total]) => ({
    label: WEEKDAY_LABELS[new Date(dateStr).getDay()],
    total,
  }));

  const allOrders = await orderRepo().find({ select: ["status"] });
  const statusCounts = new Map<OrderStatus, number>();
  for (const status of ORDER_STATUSES) statusCounts.set(status, 0);
  for (const order of allOrders) {
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
  }
  const statusBreakdown = ORDER_STATUSES.map((status) => ({
    status,
    count: statusCounts.get(status) ?? 0,
  }));

  return {
    monthRevenue,
    monthProfit,
    monthMarginPercent,
    ordersToday,
    averageTicket,
    activeCustomers,
    salesLast7Days,
    statusBreakdown,
  };
}
