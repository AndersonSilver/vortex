import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { ConsignmentPaymentMethod } from "@vortex/shared";
import { ConsignmentStore } from "./ConsignmentStore";

/** Repasse que a loja pagou para a Vortex, lançado pelo admin. Abate do saldo corrido. */
@Entity({ name: "consignment_payments" })
export class ConsignmentPayment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ConsignmentStore, { onDelete: "CASCADE" })
  @JoinColumn({ name: "store_id" })
  store!: ConsignmentStore;

  @Column({ name: "store_id", type: "uuid" })
  storeId!: string;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: "paid_at", type: "date" })
  paidAt!: string;

  @Column({ type: "varchar", default: "pix" })
  method!: ConsignmentPaymentMethod;

  @Column({ type: "varchar", nullable: true })
  note?: string | null;

  @Column({ name: "created_by_user_id", type: "uuid", nullable: true })
  createdByUserId?: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
