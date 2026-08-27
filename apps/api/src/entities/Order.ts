import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type {
  AddressDTO,
  DiscountType,
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingMethod,
} from "@vortex/shared";
import { User } from "./User";
import { OrderItem } from "./OrderItem";
import { Payment } from "./Payment";

@Entity({ name: "orders" })
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "order_number", type: "varchar", unique: true })
  orderNumber!: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User | null;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId?: string | null;

  @Column({ name: "customer_name", type: "varchar" })
  customerName!: string;

  @Column({ name: "customer_email", type: "varchar", nullable: true })
  customerEmail?: string | null;

  @Column({ name: "customer_phone", type: "varchar", nullable: true })
  customerPhone?: string | null;

  @Column({ name: "is_manual", type: "boolean", default: false })
  isManual!: boolean;

  @Column({ type: "varchar", default: "site" })
  channel!: OrderChannel;

  // Bling's own sales order id. Unique per channel so a retried/duplicated webhook never
  // registers the same order twice (see orders.service.createMarketplaceOrder).
  @Column({ name: "external_order_id", type: "varchar", nullable: true })
  externalOrderId?: string | null;

  // Which store *inside* Bling the order came from (Shopee, TikTok Shop, Mercado Livre, ...) —
  // display-only, Bling normalizes everything into the same order shape regardless of origin.
  @Column({ name: "origin_label", type: "varchar", nullable: true })
  originLabel?: string | null;

  // The marketplace's own order number (Bling's `numeroLoja`) — what the seller sees on
  // Shopee/TikTok Shop itself, distinct from externalOrderId (Bling's internal pedido id) and
  // orderNumber (Vortex's own VX-###### code).
  @Column({ name: "marketplace_order_number", type: "varchar", nullable: true })
  marketplaceOrderNumber?: string | null;

  @Column({ type: "varchar", default: "pending" })
  status!: OrderStatus;

  @Column({ name: "payment_method", type: "varchar" })
  paymentMethod!: PaymentMethod;

  @Column({ name: "payment_status", type: "varchar", default: "pending" })
  paymentStatus!: PaymentStatus;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  subtotal!: number;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0 })
  discount!: number;

  @Column({ name: "discount_type", type: "varchar", default: "fixed" })
  discountType!: DiscountType;

  @Column({ name: "discount_value", type: "numeric", precision: 10, scale: 2, default: 0 })
  discountValue!: number;

  @Column({ name: "shipping_cost", type: "numeric", precision: 10, scale: 2, default: 0 })
  shippingCost!: number;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  total!: number;

  @Column({ name: "shipping_method", type: "varchar" })
  shippingMethod!: ShippingMethod;

  @Column({ name: "coupon_code", type: "varchar", nullable: true })
  couponCode?: string | null;

  @Column({ name: "address_snapshot", type: "jsonb", nullable: true })
  addressSnapshot?: AddressDTO | null;

  @Column({ name: "tracking_code", type: "varchar", nullable: true })
  trackingCode?: string | null;

  @Column({ name: "tracking_url", type: "varchar", nullable: true })
  trackingUrl?: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items!: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments!: Payment[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
