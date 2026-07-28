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
import type { PurchaseOrderStatus } from "@vortex/shared";
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
