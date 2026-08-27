import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Order } from "./Order";

@Entity({ name: "order_items" })
export class OrderItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({ name: "order_id", type: "uuid" })
  orderId!: string;

  // Null when a Bling order item couldn't be matched to a local product (no SKU/alias hit) —
  // the order still gets imported, just without a catalog link for this line item.
  @Column({ name: "product_id", type: "uuid", nullable: true })
  productId?: string | null;

  @Column({ name: "name_snapshot", type: "varchar" })
  nameSnapshot!: string;

  @Column({ name: "price_snapshot", type: "numeric", precision: 10, scale: 2 })
  priceSnapshot!: number;

  @Column({ name: "cost_price_snapshot", type: "numeric", precision: 10, scale: 2, nullable: true })
  costPriceSnapshot?: number | null;

  @Column({ type: "int" })
  qty!: number;

  @Column({ type: "varchar" })
  color!: string;

  @Column({ type: "varchar" })
  material!: string;
}
