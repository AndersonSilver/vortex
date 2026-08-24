import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { MeasurementUnit } from "@vortex/shared";
import { ExpenseCategory } from "./ExpenseCategory";
import { Supplier } from "./Supplier";

/** Insumo não-filamento com estoque: embalagem, consumível, peça de reposição. */
@Entity({ name: "supplies" })
export class Supply {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @ManyToOne(() => ExpenseCategory, { eager: true })
  @JoinColumn({ name: "category_id" })
  category!: ExpenseCategory;

  @Column({ name: "category_id", type: "uuid" })
  categoryId!: string;

  @Column({ type: "varchar", default: "un" })
  unit!: MeasurementUnit;

  @Column({ name: "quantity_on_hand", type: "numeric", precision: 12, scale: 3, default: 0 })
  quantityOnHand!: number;

  /** Custo médio móvel por unidade, recalculado a cada entrada. */
  @Column({ name: "avg_unit_cost", type: "numeric", precision: 12, scale: 4, default: 0 })
  avgUnitCost!: number;

  @Column({ name: "low_stock_threshold", type: "numeric", precision: 12, scale: 3, default: 0 })
  lowStockThreshold!: number;

  @ManyToOne(() => Supplier, { onDelete: "SET NULL", nullable: true, eager: true })
  @JoinColumn({ name: "supplier_id" })
  supplier?: Supplier | null;

  @Column({ name: "supplier_id", type: "uuid", nullable: true })
  supplierId?: string | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
