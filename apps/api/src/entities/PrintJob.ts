import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { PrintJobStatus } from "@vortex/shared";
import { CustomQuoteRequest } from "./CustomQuoteRequest";
import { Filament } from "./Filament";
import { OrderItem } from "./OrderItem";
import { Printer } from "./Printer";

@Entity({ name: "print_jobs" })
export class PrintJob {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  label!: string;

  @ManyToOne(() => Printer, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "printer_id" })
  printer?: Printer | null;

  @Column({ name: "printer_id", type: "uuid", nullable: true })
  printerId?: string | null;

  @ManyToOne(() => Filament, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "filament_id" })
  filament?: Filament | null;

  @Column({ name: "filament_id", type: "uuid", nullable: true })
  filamentId?: string | null;

  @ManyToOne(() => OrderItem, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "order_item_id" })
  orderItem?: OrderItem | null;

  @Column({ name: "order_item_id", type: "uuid", nullable: true })
  orderItemId?: string | null;

  @ManyToOne(() => CustomQuoteRequest, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "custom_quote_id" })
  customQuote?: CustomQuoteRequest | null;

  @Column({ name: "custom_quote_id", type: "uuid", nullable: true })
  customQuoteId?: string | null;

  @Column({ type: "varchar", default: "queued" })
  status!: PrintJobStatus;

  @Column({ name: "progress_percent", type: "int", nullable: true })
  progressPercent?: number | null;

  @Column({ name: "estimated_minutes", type: "int", nullable: true })
  estimatedMinutes?: number | null;

  @Column({ name: "actual_minutes", type: "int", nullable: true })
  actualMinutes?: number | null;

  @Column({ name: "weight_grams_used", type: "int", nullable: true })
  weightGramsUsed?: number | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ name: "started_at", type: "timestamp", nullable: true })
  startedAt?: Date | null;

  @Column({ name: "finished_at", type: "timestamp", nullable: true })
  finishedAt?: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
