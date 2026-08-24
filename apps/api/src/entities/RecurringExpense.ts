import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { ExpensePaymentMethod, RecurrencePeriod } from "@vortex/shared";
import { ExpenseCategory } from "./ExpenseCategory";
import { Supplier } from "./Supplier";

/** Despesa fixa que se repete: aluguel, internet, assinatura, contador. */
@Entity({ name: "recurring_expenses" })
export class RecurringExpense {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @ManyToOne(() => ExpenseCategory, { eager: true })
  @JoinColumn({ name: "category_id" })
  category!: ExpenseCategory;

  @Column({ name: "category_id", type: "uuid" })
  categoryId!: string;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: "varchar", default: "monthly" })
  period!: RecurrencePeriod;

  @Column({ name: "due_day", type: "int", nullable: true })
  dueDay?: number | null;

  @Column({ name: "start_date", type: "date" })
  startDate!: string;

  @Column({ name: "end_date", type: "date", nullable: true })
  endDate?: string | null;

  @ManyToOne(() => Supplier, { onDelete: "SET NULL", nullable: true, eager: true })
  @JoinColumn({ name: "supplier_id" })
  supplier?: Supplier | null;

  @Column({ name: "supplier_id", type: "uuid", nullable: true })
  supplierId?: string | null;

  @Column({ name: "payment_method", type: "varchar", nullable: true })
  paymentMethod?: ExpensePaymentMethod | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
