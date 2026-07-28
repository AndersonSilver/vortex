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

  @Column({ name: "customer_email", type: "varchar" })
  customerEmail!: string;

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
