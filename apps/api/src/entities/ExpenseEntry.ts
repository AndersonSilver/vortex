import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { ExpensePaymentMethod, ExpenseSource } from "@vortex/shared";
import { Asset } from "./Asset";
import { ExpenseCategory } from "./ExpenseCategory";
import { PurchaseOrder } from "./PurchaseOrder";
import { RecurringExpense } from "./RecurringExpense";
import { Supplier } from "./Supplier";

/**
 * Livro único de despesas. Compra recebida, despesa fixa do mês, depreciação e
 * lançamento manual todos caem aqui, para o relatório não precisar unir tabelas.
 */
@Entity({ name: "expense_entries" })
export class ExpenseEntry {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ExpenseCategory, { eager: true })
  @JoinColumn({ name: "category_id" })
  category!: ExpenseCategory;

  @Column({ name: "category_id", type: "uuid" })
  categoryId!: string;

  @Column({ type: "varchar" })
  description!: string;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: "incurred_at", type: "date" })
  incurredAt!: string;

  @Column({ type: "varchar", default: "manual" })
  source!: ExpenseSource;

  @ManyToOne(() => Supplier, { onDelete: "SET NULL", nullable: true, eager: true })
  @JoinColumn({ name: "supplier_id" })
  supplier?: Supplier | null;

  @Column({ name: "supplier_id", type: "uuid", nullable: true })
  supplierId?: string | null;

  @ManyToOne(() => PurchaseOrder, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "purchase_order_id" })
  purchaseOrder?: PurchaseOrder | null;

  @Column({ name: "purchase_order_id", type: "uuid", nullable: true })
  purchaseOrderId?: string | null;

  @ManyToOne(() => RecurringExpense, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "recurring_expense_id" })
  recurringExpense?: RecurringExpense | null;

  @Column({ name: "recurring_expense_id", type: "uuid", nullable: true })
  recurringExpenseId?: string | null;

  @ManyToOne(() => Asset, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "asset_id" })
  asset?: Asset | null;

  @Column({ name: "asset_id", type: "uuid", nullable: true })
  assetId?: string | null;

  /**
   * Mês de competência (AAAA-MM) das despesas geradas em lote. Com o índice único
   * por origem, impede lançar duas vezes a mesma fixa ou depreciação no mesmo mês.
   */
  @Column({ name: "period_key", type: "varchar", length: 7, nullable: true })
  periodKey?: string | null;

  @Column({ name: "payment_method", type: "varchar", nullable: true })
  paymentMethod?: ExpensePaymentMethod | null;

  @Column({ name: "attachment_url", type: "varchar", nullable: true })
  attachmentUrl?: string | null;

  @Column({ type: "text", nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
