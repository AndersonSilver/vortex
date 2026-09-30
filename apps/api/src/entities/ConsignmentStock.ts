import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ConsignmentStore } from "./ConsignmentStore";
import { Product } from "./Product";

/** Quantas peças de um produto estão na loja e por qual repasse ela paga cada uma. */
@Entity({ name: "consignment_stock" })
@Index("IDX_consignment_stock_store_product", ["storeId", "productId"], { unique: true })
export class ConsignmentStock {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ConsignmentStore, (store) => store.stock, { onDelete: "CASCADE" })
  @JoinColumn({ name: "store_id" })
  store!: ConsignmentStore;

  @Column({ name: "store_id", type: "uuid" })
  storeId!: string;

  @ManyToOne(() => Product, { onDelete: "RESTRICT", eager: true })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column({ name: "product_id", type: "uuid" })
  productId!: string;

  @Column({ type: "int", default: 0 })
  quantity!: number;

  @Column({ name: "transfer_price", type: "numeric", precision: 10, scale: 2 })
  transferPrice!: number;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
