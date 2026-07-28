import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { PaymentMethod, PaymentStatus } from "@vortex/shared";
import { Order } from "./Order";

@Entity({ name: "payments" })
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, (order) => order.payments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({ name: "order_id", type: "uuid" })
  orderId!: string;

  @Column({ type: "varchar", default: "mercadopago" })
  provider!: string;

  @Column({ name: "mp_payment_id", type: "varchar", nullable: true })
  mpPaymentId?: string;

  @Column({ type: "varchar" })
  method!: PaymentMethod;

  @Column({ type: "varchar", default: "pending" })
  status!: PaymentStatus;

  @Column({ name: "raw_payload", type: "jsonb", nullable: true })
  rawPayload?: Record<string, unknown> | null;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  amount!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
