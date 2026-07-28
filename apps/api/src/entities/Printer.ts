import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { PrinterStatus } from "@vortex/shared";

@Entity({ name: "printers" })
export class Printer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", nullable: true })
  model?: string | null;

  @Column({ type: "varchar", default: "idle" })
  status!: PrinterStatus;

  @Column({ type: "int", default: 150 })
  wattage!: number;

  @Column({ name: "total_print_hours", type: "numeric", precision: 10, scale: 2, default: 0 })
  totalPrintHours!: number;

  @Column({ name: "purchase_cost", type: "numeric", precision: 10, scale: 2, nullable: true })
  purchaseCost?: number | null;

  @Column({ type: "varchar", nullable: true })
  location?: string | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
