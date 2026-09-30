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
import type { ConsignmentRequestStatus } from "@vortex/shared";
import { ConsignmentStore } from "./ConsignmentStore";
import { ConsignmentRequestItem } from "./ConsignmentRequestItem";
import { User } from "./User";

/** Pedido de reposição aberto pela loja consignada e aprovado/enviado pelo admin. */
@Entity({ name: "consignment_requests" })
export class ConsignmentRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ConsignmentStore, { onDelete: "CASCADE", eager: true })
  @JoinColumn({ name: "store_id" })
  store!: ConsignmentStore;

  @Column({ name: "store_id", type: "uuid" })
  storeId!: string;

  @Column({ type: "varchar", default: "pending" })
  status!: ConsignmentRequestStatus;

  @Column({ type: "text", nullable: true })
  note?: string | null;

  @Column({ name: "admin_note", type: "text", nullable: true })
  adminNote?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true, eager: true })
  @JoinColumn({ name: "requested_by_user_id" })
  requestedBy?: User | null;

  @Column({ name: "requested_by_user_id", type: "uuid", nullable: true })
  requestedByUserId?: string | null;

  @OneToMany(() => ConsignmentRequestItem, (item) => item.request, { cascade: true, eager: true })
  items!: ConsignmentRequestItem[];

  @Column({ name: "shipped_at", type: "timestamp", nullable: true })
  shippedAt?: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
