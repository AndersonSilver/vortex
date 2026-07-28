import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { FilamentMaterialType } from "@vortex/shared";
import { Supplier } from "./Supplier";

@Entity({ name: "filaments" })
export class Filament {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  brand!: string;

  @Column({ type: "varchar" })
  material!: FilamentMaterialType;

  @Column({ type: "varchar" })
  color!: string;

  @Column({ name: "color_hex", type: "varchar", nullable: true })
  colorHex?: string | null;

  @Column({ name: "spool_weight_grams", type: "int" })
  spoolWeightGrams!: number;

  @Column({ name: "remaining_weight_grams", type: "int" })
  remainingWeightGrams!: number;

  @Column({ name: "cost_per_spool", type: "numeric", precision: 10, scale: 2 })
  costPerSpool!: number;

  @Column({ name: "low_stock_threshold_grams", type: "int", default: 150 })
  lowStockThresholdGrams!: number;

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
