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
import type { ExpensePaymentMethod, PurchaseOrderStatus } from "@vortex/shared";
import { PurchaseOrderItem } from "./PurchaseOrderItem";
import { Supplier } from "./Supplier";

@Entity({ name: "purchase_orders" })
export class PurchaseOrder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: "supplier_id" })
  supplier!: Supplier;

  @Column({ name: "supplier_id", type: "uuid" })
  supplierId!: string;

  @Column({ type: "varchar", default: "pending" })
  status!: PurchaseOrderStatus;

  /** Número da nota fiscal ou do pedido no fornecedor. */
  @Column({ name: "document_number", type: "varchar", nullable: true })
  documentNumber?: string | null;

  /** Data real da compra, independente de quando foi lançada no sistema. */
  @Column({ name: "purchased_at", type: "date" })
  purchasedAt!: string;

  @Column({ name: "freight_cost", type: "numeric", precision: 12, scale: 2, default: 0 })
  freightCost!: number;

  @Column({ name: "other_charges", type: "numeric", precision: 12, scale: 2, default: 0 })
  otherCharges!: number;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  discount!: number;

  @Column({ name: "payment_method", type: "varchar", nullable: true })
  paymentMethod?: ExpensePaymentMethod | null;

  @Column({ type: "int", default: 1 })
  installments!: number;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ name: "received_at", type: "timestamp", nullable: true })
  receivedAt?: Date | null;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, { cascade: true, eager: true })
  items!: PurchaseOrderItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
