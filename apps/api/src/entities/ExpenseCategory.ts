import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { ExpenseCategoryKind, ExpenseCategoryTarget } from "@vortex/shared";

@Entity({ name: "expense_categories" })
export class ExpenseCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar" })
  kind!: ExpenseCategoryKind;

  @Column({ type: "varchar", default: "none" })
  target!: ExpenseCategoryTarget;

  @Column({ type: "varchar", default: "💸" })
  emoji!: string;

  /** Categorias do seed inicial não podem ser excluídas, só desativadas. */
  @Column({ type: "boolean", default: false })
  system!: boolean;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
