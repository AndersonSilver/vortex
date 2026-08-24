import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { AssetStatus } from "@vortex/shared";
import { ExpenseCategory } from "./ExpenseCategory";
import { Printer } from "./Printer";

/** Bem depreciável: impressora, ferramenta, mobiliário. Alimenta o custo/hora de máquina. */
@Entity({ name: "assets" })
export class Asset {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @ManyToOne(() => ExpenseCategory, { eager: true })
  @JoinColumn({ name: "category_id" })
  category!: ExpenseCategory;

  @Column({ name: "category_id", type: "uuid" })
  categoryId!: string;

  /** Vínculo opcional com a impressora cadastrada, para juntar depreciação e manutenção. */
  @ManyToOne(() => Printer, { onDelete: "SET NULL", nullable: true, eager: true })
  @JoinColumn({ name: "printer_id" })
  printer?: Printer | null;

  @Column({ name: "printer_id", type: "uuid", nullable: true })
  printerId?: string | null;

  @Column({ type: "varchar", default: "active" })
  status!: AssetStatus;

  @Column({ name: "acquired_at", type: "date" })
  acquiredAt!: string;

  @Column({ name: "acquisition_cost", type: "numeric", precision: 12, scale: 2 })
  acquisitionCost!: number;

  @Column({ name: "salvage_value", type: "numeric", precision: 12, scale: 2, default: 0 })
  salvageValue!: number;

  @Column({ name: "useful_life_months", type: "int", default: 60 })
  usefulLifeMonths!: number;

  @Column({ name: "expected_hours_per_month", type: "numeric", precision: 8, scale: 2, default: 0 })
  expectedHoursPerMonth!: number;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ name: "disposed_at", type: "date", nullable: true })
  disposedAt?: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
