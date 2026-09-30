import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { ConsignmentMovementType } from "@vortex/shared";
import { ConsignmentStore } from "./ConsignmentStore";
import { Product } from "./Product";
import { User } from "./User";

@Entity({ name: "consignment_movements" })
export class ConsignmentMovement {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ConsignmentStore, { onDelete: "CASCADE" })
  @JoinColumn({ name: "store_id" })
  store!: ConsignmentStore;

  @Column({ name: "store_id", type: "uuid" })
  storeId!: string;

  @ManyToOne(() => Product, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column({ name: "product_id", type: "uuid" })
  productId!: string;

  @Column({ type: "varchar" })
  type!: ConsignmentMovementType;

  @Column({ name: "change_quantity", type: "int" })
  changeQuantity!: number;

  /** Repasse vigente no momento do movimento. */
  @Column({ name: "transfer_price", type: "numeric", precision: 10, scale: 2 })
  transferPrice!: number;

  /** Débito da loja com a Vortex. Só vendas geram valor; os outros tipos ficam em 0. */
  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  amount!: number;

  @Column({ type: "varchar", nullable: true })
  note?: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by_user_id" })
  createdBy?: User | null;

  @Column({ name: "created_by_user_id", type: "uuid", nullable: true })
  createdByUserId?: string | null;

  @Column({ name: "request_id", type: "uuid", nullable: true })
  requestId?: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
