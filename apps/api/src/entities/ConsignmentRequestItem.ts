import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ConsignmentRequest } from "./ConsignmentRequest";
import { Product } from "./Product";

@Entity({ name: "consignment_request_items" })
export class ConsignmentRequestItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ConsignmentRequest, (request) => request.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "request_id" })
  request!: ConsignmentRequest;

  @Column({ name: "request_id", type: "uuid" })
  requestId!: string;

  @ManyToOne(() => Product, { onDelete: "RESTRICT", eager: true })
  @JoinColumn({ name: "product_id" })
  product!: Product;

  @Column({ name: "product_id", type: "uuid" })
  productId!: string;

  @Column({ name: "qty_requested", type: "int" })
  qtyRequested!: number;

  /** Definido na aprovação; 0 = item cortado. */
  @Column({ name: "qty_sent", type: "int", nullable: true })
  qtySent?: number | null;

  /** Repasse aplicado no envio. */
  @Column({ name: "transfer_price", type: "numeric", precision: 10, scale: 2, nullable: true })
  transferPrice?: number | null;
}
