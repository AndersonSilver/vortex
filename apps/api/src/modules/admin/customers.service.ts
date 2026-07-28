import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
}

export async function listCustomers(): Promise<CustomerRow[]> {
  const rows = await AppDataSource.getRepository(User)
    .createQueryBuilder("user")
    .leftJoin("orders", "order", "order.user_id = user.id AND order.status != :cancelled", {
      cancelled: "cancelled",
    })
    .where("user.role = :role", { role: "customer" })
    .select("user.id", "id")
    .addSelect("user.name", "name")
    .addSelect("user.email", "email")
    .addSelect("user.created_at", "createdAt")
    .addSelect("COUNT(order.id)", "ordersCount")
    .addSelect("COALESCE(SUM(order.total), 0)", "totalSpent")
    .groupBy("user.id")
    .orderBy("user.created_at", "DESC")
    .getRawMany();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    ordersCount: Number(row.ordersCount),
    totalSpent: Number(row.totalSpent),
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}
